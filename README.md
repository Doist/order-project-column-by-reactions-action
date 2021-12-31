# GitHub Action: Order Project Column by Reactions

Order a project's column by reactions.

## Usage

Since there's no GitHub triggers for Reactables, you'll have to use this
action with a cron trigger.

```yaml
name: Order our backlog

on:
    schedule:
        # Every Monday at midnight
        - cron: '0 * * * 1'

jobs:
    order-backlog:
        runs-on: ubuntu-latest
        steps:
            - uses: Doist/order-project-column-by-reactions-action@v1
                with:
                token: ${{ secrets.REPO_TOKEN }}
                organization: MyCoolOrg
                project_id: 31337
                column_name: Backlog
                considered_user_logins: |-
                    product_owner
                    tech_lead
                considered_reactions: thumbs_up
```

`considered_user_logins` and `considered_reactions` are optional. Check [`action.yml`](./action.yml) for more details.

`token` has to be a token with `repo:write` access (so it can change org projects).

## Contributing

PRs accepted. Make sure you install [pre-commit](https://pre-commit.com/) on your working copy.

## Testing

Nothing implemented. 😞 You'll have to manually check your changes.

There's two ways to do this:

-   When changing a workflow, or to test the script running on GitHub Actions, add a `push` trigger temporarily and check things behave as expected.
-   Locally, you can export the arguments as env variables and run the script directly:

    ```bash
    export INPUT_TOKEN=MY-COOL-TOKEN
    export INPUT_ORGANIZATION=MyCoolOrg
    export INPUT_PROJECT_ID=31337
    export INPUT_COLUMN_NAME=Backlog
    export INPUT_CONSIDERED_USER_LOGINS="$(echo "product_owner tech_lead" | xargs -n 1)"
    export INPUT_CONSIDERED_REACTIONS="$(echo "thumbs_up" | xargs -n 1)"

    node index.js
    ```

## Releasing

Follow the normal [GitHub Actions release](https://docs.github.com/en/actions/creating-actions/releasing-and-maintaining-actions) procedure.
