const core = require('@actions/core')
const github = require('@actions/github')

const shouldConsider = (consideredSet, target) => {
    if (!consideredSet || !consideredSet.length) return true

    return consideredSet.includes(target)
}

const getMultilineInput = (name, options) =>
    core.getMultilineInput(name, options).map((s) => s.trim())

;(async () => {
    const octokit = new github.getOctokit(core.getInput('token', { required: true }))

    const organization = core.getInput('organization', { required: true })
    const projectId = parseInt(core.getInput('project_id', { required: true }))
    const columnName = core.getInput('column_name', { required: true })
    const consideredUserLogins = getMultilineInput('considered_user_logins')
    const consideredReactions = getMultilineInput('considered_reactions').map((s) =>
        s.toUpperCase(),
    )

    if (!projectId) {
        throw new Error(`projectId number be a valid integer`)
    }

    const resp = await octokit.graphql(
        `query ($organization: String!, $projectId: Int!) {
          organization(login: $organization) {
            project(number: $projectId) {
              columns(first: 10) {
                nodes {
                  id
                  name
                  cards(first: 100, archivedStates: [NOT_ARCHIVED]) {
                    nodes {
                      id
                      content {
                        ... on Reactable {
                          reactions(first: 100) {
                            edges {
                              node {
                                content
                                user {
                                  login
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        {
            organization,
            projectId,
        },
    )

    const column = resp.organization.project.columns.nodes.find((c) => c.name == columnName)
    if (!column) {
        throw new Error(`Can't find column named ${columnName} on project with id ${projectId}`)
    }

    const initalCards = column.cards.nodes

    const reactedCards = initalCards.map((c, index) => ({
        cardId: c.id,
        index,
        reactionCount: c.content.reactions.edges.filter(
            (e) =>
                shouldConsider(consideredUserLogins, e.node.user.login) &&
                shouldConsider(consideredReactions, e.node.content),
        ).length,
        initialAfterCardId: ((i) => (i ? i.id : null))(initalCards[index - 1]),
    }))

    reactedCards.sort(
        // reactionCount desc, index asc
        (a, b) => b.reactionCount - a.reactionCount || a.index - b.index,
    )

    const payloads = reactedCards
        .map((c, index) => ({
            cardId: c.cardId,
            columnId: column.id,
            initialAfterCardId: c.initialAfterCardId,
            afterCardId: ((i) => (i ? i.cardId : null))(reactedCards[index - 1]),
        }))
        .filter((c) => c.initialAfterCardId !== c.afterCardId)

    if (!payloads.length) {
        return 'Already ordered.'
    }

    await octokit.graphql(`mutation doItAll {
      ${payloads
          .map(
              (p, index) =>
                  `m${index}: moveProjectCard(input:{
                    cardId: ${JSON.stringify(p.cardId)}
                    columnId: ${JSON.stringify(p.columnId)}
                    afterCardId: ${JSON.stringify(p.afterCardId)}
                  }){clientMutationId}\n`,
          )
          .reduce((a, s) => a.concat(s))}
    }`)

    return `Ordered ${payloads.length} cards.`
})().then(
    (result) => core.info(result),
    (error) => core.setFailed(error.message),
)
