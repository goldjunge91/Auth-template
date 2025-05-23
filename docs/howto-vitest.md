> Cover photo by <a href="https://unsplash.com/@catherineheath?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Catherine Heath</a> on <a href="https://unsplash.com/?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
  
If you prefer to just dig into the code, you can find it here:

{% github kuroski/github-issue-viewer %}

If you would like to read more articles like this one, you can find them [here](https://medium.com/@daniel.kuroski).

## Introduction

This article is something I wish I had back then when I was first trying to set up the testing environment for my side project.

It is a "Github issue viewer" app, so you should be able to login into your Github account and see a list of issues for your account.

<figure>
![Application preview](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0a8tnhd1yt7lrjqtyhlv.png)
<figcaption align = "center">
Feel free to check at: <a href="https://github-issue-viewer.up.railway.app" title="Application URL">https://github-issue-viewer.up.railway.app</a>
</figcaption>
</figure>

---

I've chosen to build this app with a combination of several tools, but probably the most important ones are: 
- [Next.js](https://nextjs.org/) 
- [NextAuth.js](https://next-auth.js.org/) 
- [Prisma](https://www.prisma.io/) 
- [trpc](https://trpc.io/)

> If you want to see more in-depth the tech stack, check it out [here](https://github.com/kuroski/next-project-template)

I could use something simpler, but my main goal is to 
> validate how I would integrate those specific tools + how I would test my application.

I saw a lot of resources on how you would test a Next.js application, but I was not fully happy with how I would do that with the things I'm using here.

This is also a bit different compared to testing a pure React/Vue/X application, where they are way [simpler to write](https://medium.com/homeday/confident-js-series-part-3-test-what-improves-your-confidence-9e9b5b6282f2).

### The challenges

Here I have to:
- Handle `NextAuth.js` OAuth state in a nicer way compared to other solutions I've found
- Handle Github API requests
- Handle Prisma integration

We have a full-blown application with a client and a server-side, authentication is taking place (not just on the client), and our app also makes requests to a third-party API **FROM** the server side.

Just like we have in testing-library
> The more your tests resemble the way your software is used,
the more confidence they can give you.

And that is exactly what I wanted to achieve.

## Configuring the testing environment

Let's finally dive into the code.

> I won't go into details on how the application works and how to set up everything, my main goal here is to show how to set up the testing environment.

The main idea here is:
- We would have a Docker file, which we can use to spin up our database
- A mock server would be needed to intercept Github API requests and avoid calling/bloating Github API **(We do not want to mock internal API calls)**
- We have to somehow boot up our application when executing Playwright (our testing framework of choice), by doing that we also have to
  - Make sure a user is in our database
  - We have to authenticate our user
  - We have to mock Github API calls with our mock server

### Docker

Let's start by creating a `docker-compose.yml` file, like this one:

``` yml
# https://github.com/kuroski/github-issue-viewer/blob/main/docker-compose.yml

version: "3.9"

services:
  # in case you prefer going with mysql
  db:
    image: mysql:oracle
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_PASSWORD: secret
      MYSQL_DATABASE: githubIssueViewer
    volumes:
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init-script.sql
      - mysql:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - mysql

  # in case you prefer going with pg
  db-pg:
    image: postgres
    restart: always
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres:/data/postgres
    ports:
      - "5432:5432"
    networks:
      - postgres

networks:
  mysql:
    driver: bridge
  postgres:
    driver: bridge

volumes:
  postgres:
  pgadmin:
  mysql:
```

By running `docker-compose up` you'll have a database ready to use for our dev environment and our local tests 🎉. 

Just don't forget to properly configure `Prisma` to use the correct database provider and add the database URL in your environment variables:

```
# in case you want to use PG
DATABASE_URL=postgresql://postgres:secret@127.0.0.1:5432

# in case you want to use mysql
DATABASE_URL=mysql://root:secret@127.0.0.1:3306/githubIssueViewer
```

### Playwright

For this project, I chose to use [Playwright](https://playwright.dev/), since I wanted to be more familiar with it.

For Playwright, you should have a configuration file in your project root:

``` typescript
// https://github.com/kuroski/github-issue-viewer/blob/main/playwright.config.ts

import type { PlaywrightTestConfig } from "@playwright/test"
import { devices } from '@playwright/test'

// Reference: https://playwright.dev/docs/test-configuration
const config: PlaywrightTestConfig = {
  // ...
  
  // We will set up our required credentials here
  globalSetup: './e2e/setup/globalSetup.ts',

  use: {
    // ...

    // This is the file we will use to setup and retrieve our application state (in our case, the authentication cookies)
    storageState: './e2e/setup/storageState.json'
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
}
export default config
```

Then we need to configure `globalSetup.ts` which we will make sure our testing environment will have all the pre-required data in place.

``` typescript
// https://github.com/kuroski/github-issue-viewer/blob/main/e2e/setup/globalSetup.ts

import { chromium } from '@playwright/test';
import path from 'node:path'

import prisma from '@/lib/prisma';

async function globalSetup() {
  const storagePath = path.resolve(__dirname, 'storageState.json')

  const date = new Date()

  // This is a dummy random session token
  const sessionToken = '04456e41-ec3b-4edf-92c1-48c14e57cacd2'

  // 1. We make sure a test user exists in our local database, `upsert` will make sure we only have this user in our database
  await prisma.user.upsert({
    where: {
      email: 'e2e@e2e.com'
    },
    create: {
      name: 'e2e',
      email: 'e2e@e2e.com',
      // 2. We need a session which is used by NextAuth and represents this `e2e@e2e.com` user login session
      sessions: {
        create: {
          // 2.1. Here we are just making sure the expiration is for a future date, to avoid NextAuth to invalidate our session during the tests
          expires: new Date(date.getFullYear(), date.getMonth() + 1, 0),
          sessionToken
        }
      },
      // 3. Here we are binding our user with a "Github fake account", this is needed since we are using OAuth, we don't have to worry about this data since we are gonna intercept and mock the direct Github API calls
      accounts: {
        create: {
          type: 'oauth',
          provider: 'github',
          providerAccountId: '2222222',
          access_token: 'ggg_zZl1pWIvKkf3UDynZ09zLvuyZsm1yC0YoRPt',
          token_type: 'bearer',
          scope: 'read:org,read:user,repo,user:email'
        }
      }
    },
    update: {},
  })
  
  // 4. Finally we need to set up the authentication cookie into our test browser state
  // This will guarantee you will have an authenticated user once you boot up your tests
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: storagePath });
  // 4.1. This cookie is what `NextAuth` will look after to validate if our user is authenticated
  // Please note that the `value` of the cookie **must be the same** as the `sessionToken` we added in `step 2.` 
  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      expires: 1661406204
    }
  ])
  await context.storageState({ path: storagePath });
  await browser.close();
}

export default globalSetup;
```

### Mock server

For this part, I've chosen to go with [msw](https://mswjs.io/), because I wanted to validate this library since I usually used [mirage.js](https://miragejs.com/).

msw also has a [@msw/data](https://github.com/mswjs/data) library to help out with the data modeling of our tests.

The first thing would be creating our API endpoint handlers:

``` typescript
// https://github.com/kuroski/github-issue-viewer/blob/main/e2e/mocks/handlers.ts

import { faker } from '@faker-js/faker';
import { factory, manyOf, nullable, oneOf, primaryKey } from '@mswjs/data';
import type { ENTITY_TYPE, PRIMARY_KEY } from "@mswjs/data/lib/glossary";
import { rest } from 'msw';

// 1. We define our factory functions, so every time we request those Github endpoints, we will have some "generated" data instead of calling the Github API
export const db = factory({
  label: {
    id: primaryKey(faker.datatype.number),
    url: faker.internet.url,
    name: faker.random.words,
    description: nullable(faker.hacker.phrase),
    color: faker.internet.color,
  },
  // ...
})
type DB = typeof db;

// 2. We will need this type for later, it will be used to enable us to extract the factory function property types, for example, `FactoryValue<'label'>`
export type FactoryValue<Key extends keyof DB> = Omit<
  ReturnType<DB[Key]['create']>,
  typeof ENTITY_TYPE | typeof PRIMARY_KEY
>;

// 3. Finally, we will have our request handlers
// They are the gonna determine whether an outgoing request should be mocked, and specifies its mocked response
export const issuesHandler = () =>
  rest.get('https://api.github.com/user/issues', (_req, res, ctx) => {
    // 3.1. For this case, I chose to just create one issue for each situation I wanted to test, and we need to make sure the are not re-created between our tests
    if (db.issue.count() === 0) {
      db.issue.create({
        state: 'open',
        repository: db.repository.create(),
        pull_request: db.pullRequest.create(),
        assignees: [...Array(3)].map(db.assignee.create),
        labels: [],
      })
      db.issue.create({
        state: 'open',
        repository: db.repository.create(),
        pull_request: null,
        assignees: [],
        labels: [],
      })
      db.issue.create({
        state: 'closed',
        closed_at: faker.date.recent().getTime(),
        repository: db.repository.create(),
        pull_request: db.pullRequest.create(),
        assignees: [...Array(3)].map(db.assignee.create),
        labels: [],
      })
      db.issue.create({
        state: 'closed',
        closed_at: faker.date.recent().getTime(),
        repository: db.repository.create(),
        pull_request: null,
        assignees: [],
        labels: [],
      })
    }

    return res(
      ctx.status(200),
      ctx.json(db.issue.getAll())
    )
  })

const handlers = [
  issuesHandler(),
  rest.get('https://api.github.com/user/orgs', (_req, res, ctx) => res(
    ctx.status(200),
    ctx.json([...Array(5)].map(db.org.create))
  )),
  rest.get('https://api.github.com/user/repos', (_req, res, ctx) => res(
    ctx.status(200),
    ctx.json([...Array(5)].map(db.repo.create))
  )),
]

export default handlers
```

Then finally we just need to set up our server

``` typescript
// https://github.com/kuroski/github-issue-viewer/blob/main/e2e/mocks/mockServer.ts

import { setupServer } from "msw/lib/node"

import handlers from "@/e2e/mocks/handlers"

function bootstrap() {
  // 1. The server will make use of the handlers we created in the previous section
  return setupServer(...handlers)
}

export default bootstrap
```

### Connecting everything and testing the application

This is the tricky part of the process, we have two main problems here:
- How to boot our application during our tests + connect it with our mock server?
- How to make the mock server run against the server layer (not the browser)?

> If you wish you can skip the explanation and go directly to the next section to see the code.

![problem description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/j62dva8xskqrx5tmbgf2.png) 

I have found two amazing articles that explain this with more in-depth concepts:
- https://blog.byndyusoft.com/testing-next-js-website-with-cypress-a8475fd087e2
- https://glebbahmutov.com/blog/mock-network-from-server/

I've tried a few different approaches here, the one worth mentioning is:
> Running a dev server with our tests turn on msw while building it

- You would need to [add a custom `webServer`](https://github.com/kuroski/github-issue-viewer/blob/45848325b1e6f557dddec24a16dea1288710d8d3/playwright.config.ts#L28) to playwright
- That will spin up a custom [Next.js server](https://github.com/kuroski/github-issue-viewer/blob/45848325b1e6f557dddec24a16dea1288710d8d3/e2e/mocks/server.ts) before our tests
- You can [start the mock server](https://github.com/kuroski/github-issue-viewer/blob/45848325b1e6f557dddec24a16dea1288710d8d3/e2e/mocks/server.ts#L15) during that phase
- Then you can just [write your tests](https://github.com/kuroski/github-issue-viewer/blob/45848325b1e6f557dddec24a16dea1288710d8d3/e2e/issues.spec.ts#L11)

The main problem with this approach is that we can't change mocked responses after Next.js startup.

Which will lead us to the actual solution I chose to go for.

#### The solution

To make it work, first, we need to create a custom `Next.js` server

``` typescript
// https://github.com/kuroski/github-issue-viewer/blob/main/e2e/mocks/server.ts

import Koa from "koa"
import { SetupServerApi } from "msw/lib/node";
import next from "next";
import { parse } from "node:url";

import bootstrapMockServer from '@/e2e/mocks/mockServer';

// 1. Create a new Koa server
const server = new Koa()

// 2. Create a new Next.js instance
const app = next({ dev: process.env.CI ? false : true })
const handle = app.getRequestHandler()
const port = process.env.PORT || 3000;

async function bootstrap(): Promise<SetupServerApi> {
  return new Promise(async (resolve) => {
    try {
      await app.prepare()

      // 3. Create a new mock server after Next.js instance is ready (The order matters)
      const mockServer = bootstrapMockServer()

      // 4. From this part on we can already intercept HTTP requests coming from the Next.js server
      mockServer.listen({ onUnhandledRequest: 'warn' })
      
      // 5. Create a middleware function in our Koa server, that will intercept every request and we handle that request with our Next.js app
      server.use(ctx => {
        const parsedUrl = parse(ctx.req.url!, true);
        return handle(ctx.req, ctx.res, parsedUrl)
      });

      // 6. Finally we just need to listen to our Koa server
      // We are using `0` here since we might have several tests running in parallel, by doing that, Node will choose a random available port for us
      const s = server.listen(0)

      // 7. We need to wait until the server is ready
      // We are doing this since ports are automatically generated, this way we can provide the port to the service that instantiate the server
      s.on('listening', () => {
        const port = (<AddressInfo>s.address()).port
        console.log(`> Ready on localhost:${port} - env ${process.env.NODE_ENV}`);
        resolve({
          mockServer,
          baseURL: `http://localhost:${port}`
        })
      });
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })

}

export default bootstrap
```

This is just a custom Next.js server, just as they provide in [their documentation](https://nextjs.org/docs/advanced-features/custom-server), the two main differences here are:
- I'm using [Koa](https://koajs.com/) instead of express
- I'm adding our mock server in the middle of the code

Then you just have to boot up the server in the correct testing phase.

> This is an important part! We have to generate our servers in automatic ports, otherwise, we might face a collision if a server is already instantiated in that same port in a different process.

![Server error](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/quw2qrachpw1bai7b4fu.png)
 
#### Our first test

``` typescript
// https://github.com/kuroski/github-issue-viewer/blob/main/e2e/issues.spec.ts

import { drop } from '@mswjs/data';
import { Page } from '@playwright/test';
import { SetupServerApi } from 'msw/lib/node';

import { db, FactoryValue } from '@/e2e/mocks/handlers';
import server from '@/e2e/mocks/server'
import { expect, test } from "@/e2e/test";
import { dateTimeFormat } from "@/lib/utils";

test.describe("Github issues app", () => {
  let props: { mockServer: SetupServerApi, baseURL: string }

  // 1. First, we make sure mockServer is properly instantiated and that we also store the baseURL that our server is returning
  // We can instantiate it in other stages, but doing that in beforeAll is a bit easier for this example + we only create one instance per suite
  test.beforeAll(async () => {
    props = await server()
  })
  
  // 2. We must always reset mockServer handlers and drop the in-memory database after each test 
  test.afterEach(() => {
    props.mockServer.resetHandlers()
    drop(db)
  })
  
  // 3. I like to have a "build" function which I'm using to extract some common login from my tests
  // This function will handle the page navigation/will wait for all required requests to be done
  const build = async (page: Page) => {
    const date = dateTimeFormat({ day: 'numeric', month: 'short', year: 'numeric' })
    
    // 3.1 don't forget to prefix urls with `baseURL`, since our server address is automatically generated
    await page.goto(`${props.baseURL}/?state=all&type&visibility`);

    await Promise.all([
      page.waitForResponse('**/api/trpc/github.issues.list*'),
    ])

    const openedIssues = db.issue.findMany({
      where: {
        state: {
          equals: 'open'
        }
      }
    })

    const closedIssues = db.issue.findMany({
      where: {
        state: {
          equals: 'closed'
        }
      }
    })
    
    // 3.2 Then we return a list of common helpers, like our database entries, our locators, etc... For me, this make our tests look cleaner
    // All that "configuration" part is extracted into this section, which I can ignore and I can read my tests in a more "human" way
    // I like the fact my "helpers" live next to my tests + try not to extract everything into this place (or different files), this function just has some "minor" things, but if I have to scroll up and down (or change files) to understand my test flow, then I think is not very cool since it kinda distracts you from actually understanding what you are testing
    return {
      openedIssues,
      closedIssues,
      issuesResponse: () => page.waitForResponse('**/api/trpc/github.issues.list*'),
      locators: {
        openedIssuesCountButton: () => page.locator(`button:has-text("Open ${openedIssues.length}")`),
        closedIssuesCountButton: () => page.locator(`button:has-text("Closed ${closedIssues.length}")`),
        issue: (issue: FactoryValue<'issue'>) => {
          const issueRow = page.locator(`data-testid=issue-${issue.id}`)
          const icon = {
            'open': 'issue-open-icon',
            'closed': 'issue-closed-icon',
          }[issue.state]
          const subtitle = {
            'open': `${issue.repository!.full_name} #${issue.number} opened on ${date.format(issue.created_at)} by ${issue.user.login}`,
            'closed': `${issue.repository!.full_name} #${issue.number} by ${issue.user.login} was closed on ${date.format(issue.closed_at)}`,
          }[issue.state]

          return {
            title: () => issueRow.locator('h3', { hasText: issue.title }).locator(`a[href="${issue.html_url}"]`),
            icon: () => issueRow.locator(`data-testid=${icon}`),
            subtitle: () => issueRow.locator('p', { hasText: subtitle }),
            prLink: () => issueRow.locator(`data-testid=issue-pull-request-${issue.id}`),
            comments: () => issueRow.locator(`a[href="${issue.html_url}"]`, { hasText: String(issue.comments) }),
            assignee: (assignee: FactoryValue<'assignee'>) => issueRow.locator(`a[href="${assignee.html_url}"]`).locator(`img[src="${assignee.avatar_url}"][alt~="${assignee.login}"]`),
          }
        }
      }
    }
  }
  
  // 4. Finally, we have our first tests
  test("a user can see a list of issues", async ({ page }) => {
    // 4.1 Because of the `build` function, we just have to call it and use our locators to assert what we want
    const {
      openedIssues,
      closedIssues,
      locators
    } = await build(page)
    
    // Then I can just follow through to my assertions =D
    await expect(locators.openedIssuesCountButton()).toBeVisible()
    await expect(locators.closedIssuesCountButton()).toBeVisible()

    for (const issue of [...openedIssues, ...closedIssues]) {
      const issueLocators = locators.issue(issue)
      await expect(issueLocators.title()).toBeVisible()
      await expect(issueLocators.icon()).toBeVisible()
      await expect(issueLocators.subtitle()).toBeVisible()


      if (issue.pull_request) {
        await expect(issueLocators.prLink()).toBeVisible()
      } else {
        await expect(issueLocators.prLink()).not.toBeVisible()
      }


      if (issue.comments > 0) {
        await expect(issueLocators.comments()).toBeVisible()
      } else {
        await expect(issueLocators.comments()).not.toBeVisible()
      }

      for (const assignee of issue.assignees) {
        await expect(issueLocators.assignee(assignee)).toBeVisible()
      }
    }
  });

  test("a user can filter issues", async ({ page }) => {
    // ......
  });
});
```

We can override our factory function's behaviors by changing things before calling the `build` function
``` typescript
test("a user can see a list of issues", async ({ page }) => {
    props.mockServer.use(
      issuesHandler(...),
      // or manually
      rest.get('https://api.github.com/user/orgs', (_req, res, ctx) => res(
        ctx.status(500),
        ctx.json({ error: "OOps" })
      ))
    )
    
    const { locators } = await build(page)
})
```

We can also evolve how we use our factory functions and create some cool APIs to make our tests read better, check this pseudo-code on an idea of a composable API
``` typescript
test("a user can see a list of issues", async ({ page }) => {
    await pipe(
      props.mockServer, // I want to start with my mockServer
      withClosedIssues(5), // I want it with 5 closed issues
      withIssue({
        title: "Custom issue"
      }) // I want also a random issue with a specific title
    )

    // if you are not a fan of pipping + using composable functions, you can create a different structure
    
    const mock = new MockServer(props.mockServer)
      .withClosedIssues(5)
      .withIssue({
        title: "Custom issue"
      })

    await mock.build()
    
    const { locators } = await build(page)
})
```


## Configure Github Actions

Finally the last topic =D
We made it! The tests are running, and everything is green and working, but how would we add to our CI environment?

Well, is pretty simple:

``` yml
# https://github.com/kuroski/github-issue-viewer/blob/main/.github/workflows/ci.yml

name: CI

on:
  push:
    branches:
      - main

# 1. First, we add the required environment variables to our file (don't forget to include everything you need from your .env file)
# You can also provide them within your repo actions secret page
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/githubIssueViewer
  GITHUB_ID: "123"
  GITHUB_SECRET: "123"
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: 1 # Skip downloading during yarn install
  PLAYWRIGHT_BROWSERS_PATH: 0 # Places binaries to node_modules/@playwright/test

jobs:
  playwright:
    name: "Playwright Tests"
    runs-on: ubuntu-latest
    services:
      # 2. Include a postgres service, this will spin up a database for you in your CI environment (check the script below if you want to use mysql)
      postgres:
        image: postgres
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      # 3. Checkout our repo code
      - uses: actions/checkout@v3
      
      # 4. Setup node with the latest lts version
      - uses: actions/setup-node@v3
        with:
          node-version: "lts/*"
  
      # 5. I'm using pnpm, so here I'm making sure it's properly installed
      - name: Install pnpm
        uses: pnpm/action-setup@v2.2.2
        id: pnpm-install
        with:
          version: 7.7.0
          run_install: false

      # 6. Setup the CI cache directory for pnpm
      - name: Get pnpm store directory
        id: pnpm-cache
        run: |
          echo "::set-output name=pnpm_cache_dir::$(pnpm store path)"

      # 7. Setup the cache itself
      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ steps.pnpm-cache.outputs.pnpm_cache_dir }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      # 8. Install our dependencies and build the project
      # As an important note, because of caching we need to make sure we are properly installing Playwright
      # The `pnpm install:playwright` script is just an alias for `playwright install --with-deps`
      - name: Install dependencies
        run: pnpm install && pnpm install:playwright
      - name: Build application
        run: pnpm build
    
      # 9. We need to make sure our database tables are properly set up
      - name: Migrate database
        run: pnpx prisma db push --preview-feature

      # 10. Finally, we run our tests ;D
      - name: Run your tests
        run: pnpx playwright test
```

There we go, you have your tests running in Github actions
https://github.com/kuroski/github-issue-viewer/actions/runs/2818168183

In case you are using mysql:

- Just replace the `DATABASE_URL: mysql://root:secret@127.0.0.1:3306/githubIssueViewer` env variable
- Remove the PG service
- Add an extra step before setting up node
``` yml
 - name: Set up MySQL
   uses: mirromutth/mysql-action@v1.1
   with:
     mysql database: githubIssueViewer
     mysql user: root
     mysql root password: secret
     mysql password: secret
```
 
## Conclusion

We did it! Thanks for reading this guide =D!
I hope this setup might help you out, also, feel free to reach me if you have any other suggestions + or if you think I could have implemented it differently.