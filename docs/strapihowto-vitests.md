Introduction
As your web app becomes complex with newly added features, it may be hard to keep track of the most important logic that is needed in the web app. A good way to maintain your codebase is to write tests. With tests, you become aware of whether your web app works as you want it to or if newly added features break the app.

In this article, you will write unit tests in Next.js client components and synchronous server components using Vitest and React Testing Library, and you will write end-to-end tests for your async server components using Playwright.

Benefits of Software Testing
Tests help to save time that would normally be spent during debugging hours.
Tests are a way to diagnose your codebase without having to debug manually.
Manual debugging processes consume too much time. You write tests and run the tests automatically, and you are provided with feedback and possible suggestions that help improve the quality of your code.
Tests help to gain increased confidence in yourself or as a team.
Tests also serve as a documentation guide for other developers who may be collaborating with you on your project.
It helps the developers to understand the expected behavior of the code. Thus contributing to a cleaner, readable, and maintainable codebase.
Types of Software Testing
Unit Testing: Involves individual functions, modules, or components that are tested in isolation.
End-to-End Testing: Requires that all the possibly needed logic work together in the codebase, including network requests and other server-side logic.
Integration Testing: Involves the combination and interaction of multiple units or modules that are tested together to form a certain part of the software as a whole entity. Its approach is taken after the completion of unit testing.
Performance Testing: Involves the evaluation of the speed and responsiveness of the software as a whole. Its goal is to determine the entire user experience of the software over various performance metrics.
Accessibility Testing: Involves the confirmation that the software can be easily navigated and easily understood by assistive technologies for diverse groups of users based on their special needs.
Unit Testing in Next.js with Vitest and React Testing Library
Vitest is a high-performance testing framework created specifically for writing unit tests, with built-in features that make it easier to run the tests. Here, we will be integrating Vitest with React Testing Library - @testing-library/react.

React Testing Library provides APIs that make it possible to work with React components. It needs to be installed together with jsdom which makes it possible to query the DOM nodes on a web page.

Next.js Setup and Installation
Create an initial Next.js project setup by running the command below on your terminal:


npx create-next-app
Select JavaScript as the programming language so you can follow up with this article.

Add Vitest to Next.js
Then, add Vitest to your already existing Next.js project with the command:


npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
# or
yarn add -D vitest @vitejs/plugin-react jsdom @testing-library/react
# or
pnpm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
# or
bun add -D vitest @vitejs/plugin-react jsdom @testing-library/react
Next, create a vitest.config.mjs|mts file in the root directory of your project to include the configuration settings for Vitest:


// vitest.config.mjs

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  }
})
Configuring Test Files
We want to save all our tests, regardless of their types, in the same root folder. To achieve this, create an all-tests folder in the root directory of your project. Then, create a vitest-unit-tests subfolder inside the all-tests folder.

Next, inside your vitest.config.mjs|mts file, include the all-tests/vitest-unit-tests folder:


// vitest.config.mjs

import { defineConfig } from 'vitest/config'
import react from 'vitejs-plugin/react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['./all-tests/vitest-unit-tests/**/*.{test, spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
  }
})
This enables you to run your vitest unit tests specifically from the vitest-unit-tests folder, while any of your test files can end with a .test or .spec name-saving convention.

Installing @testing-library/dom
testing-library/dom is a library that provides utilities that enable you to query the DOM for nodes in such a way that a user would find elements on a web page. It needs to be installed as one of your project's development dependencies devDependencies.

To install @testing-library/dom, run the command below:


npm install --save-dev @testing-library/dom`.
Installing @testing-library/jest-dom
We want our tests to assert the exact values that we want to confirm in our components. Vitest does not support a complete list of other possible matches. Hence we will be installing testing-library/jest-dom in our project. jest-dom provides custom Jest matches and is compatible with Vitest. Install jest-dom by running the command on your terminal:


npm install --save-dev @testing-library/jest-dom
# or
yarn add --dev @testing-library/jest-dom
Then, create a vitest-setup.js|ts file in the root directory of your project. Inside the vitest-setup.js file, import '@testing-library/jest-dom/vitest'. Here is what the file should look like:


// vitest-setup.js

import '@testing-library/jest-dom/vitest'
Next, add vitest-setup.js to the setupFiles field inside vitest.config.mjs|mts file:


// vitest.config.mjs

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['./all-tests/vitest-unit-tests/**/*.{test, spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['./vitest-setup.js']
  }
})
Installing @testing-library/user-event
For you to be able to perform user interaction on selected DOM nodes on a web page, you need to install testing-library/user-event, a companion library that provides the ability to simulate user actions such as mouse events and keyboard navigation. Install user-event as one of your project's devDependencies by running this command on your terminal:


npm install --save-dev @testing-library/user-event 
Running Unit Tests in Next.js with Vitest
To confirm that you have installed all the dependencies that you need for the Vitest unit tests in Next.js, check the devDependencies field in your package.json file:


{
  // ...
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.1",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^8",
    "eslint-config-next": "15.0.3",
    "jsdom": "^25.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "vitest": "^2.1.6"
  }
}
Next, in the "scripts" field inside your package.json file, add "test": "vitest":


{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest"
  }
}
Adding "test": "vitest" enables you to run your unit tests with the command:


npm run test 
# or 
yarn test
# or
pnpm test
# or
bun run test
Alternatively, you can run your unit tests directly, using the npx vitest command.

Writing Unit Tests in Next.js with Vitest
Testing Next.js Apps Server Side
Here, we will be testing Next.js apps server side. The app/grandSlam/page.jsx file below is an example of a synchronous server component. We will be writing tests to check if the component displays the lists of tournaments as we would prefer.


//  app/grandSlam/page.jsx

export default function GrandSlam() {
  return (
    <main>
      <h1>
        The Grand Slam consists of four major tournaments in the tennis
        championship. A player who wins all four championships is said to be a
        Grand Slam winner.
      </h1>
      <p>These championships are:</p>
      <ul>
        <li>Australian Open</li>
        <li>French Open</li>
        <li>Wimbledon</li>
        <li>US Open</li>
      </ul>
    </main>
  );
}
Inside the all-tests/vitest-unit-tests folder, create a grandSlam.test.jsx file and add the code below. Remember that we will be saving all our other unit tests in the same all-tests/vitest-unit-tests folder.


// grandSlam.test.jsx

import {test, describe, expect } from 'vitest'
import {render, screen, within } from '@testing-library/react'

import GrandSlam from '../../app/grandSlam/page'

render(<GrandSlam/>)

test('has the tournament keyword', () => {
    const tournamentKeyword = within(screen.getByText(/tournament/i))

    expect(tournamentKeyword).toBeDefined()
})

describe('has all the four grand slam tournaments', () => {

    test('has Australian Open tournament', () => {
        expect(screen.getByText(/australian open/i)).toBeDefined()
    })

    test('has French Open tournament', () => {
        expect(screen.getByText(/french open/i)).toBeDefined()
    })

    test('has Wimbledon tournament', () => {
        expect(screen.getByText(/wimbledon/i)).toBeDefined()
    })

    test('has US Open tournament', () => {
        expect(screen.getByText(/us open/i)).toBeDefined()
    })
})

// This test case has the options argument, using the object syntax to specify a skipped test

test('has the tennis keywords', { skip: true}, () => {
    const tennisKeyword = within(screen.getByText('tennis'))

    expect(tennisKeyword).toBeDefined()
})

// Alternatively, you can indicate the options argument using the dot syntax to specify a skipped test

test.skip('this test case will be skipped', () => {})

describe.skip('this test suite will be skipped', () => {})
Run the tests with the command: npm run test grandSlam.test.jsx.

Testing Next.js Synchronous Server Components.png

In the grandSlam.test.jsx file above,

test: specifies a test case and receives three arguments Test name, Options, and Function.
Test name: A string that explains the purpose of each test case.
Options: An object to specify how the test behaves. It is not necessary to use the options arguments.
Function: returns the code written for the test execution, including queries and assertions, which will be discussed later in this article.
describe: specifies a test suite. A test suite is a collection of multiple test cases. You can use the describe function to group similar test cases. It helps to improve test readability.
render: loads the component on the web page by creating a new node which is appended to document.body. You must render the component you want to test.
screen: gains access to DOM nodes that are rendered on the web page with the help of different query methods.
within: points to the fact that we want to interact with nodes that can only be found directly under their parent DOM nodes.
expect: executes or asserts the selected DOM nodes or elements and checks if they behave exactly the way we want them to.
skip: An option that specifies that an exact test will be skipped while running a test file.
Querying the DOM
To find certain DOM nodes or elements on the web page, use Queries. There are different categories of Queries: get, find and query.

To query single elements, use: getBy..., findBy..., or queryBy....
To query multiple elements at once, use: getAllBy..., findAllBy..., or queryAllBy....

Let us understand the difference between each category of Queries:

get: Throws an error message if the requested node cannot be found.
query: Returns null or an empty array if the requested node cannot be found.
find: Shows that a Promise is being rejected if the requested node cannot be found.
Making Assertions with Vitest in Next.js
To assert or confirm that a value is present or not present in your tests, you need to use matches, which return the exact values. Examples of matchers are: toBe(), toContain(), toHaveTextContent(), toHaveLength(), toBeChecked(), toHaveValue(), toBeVisible(), toBeInTheDocument(), toContainElement(), toHaveFocus().

You can make negative assertions with the .not modifier. For example, expect(selectedElement).not.toBeInTheDocument() asserts that the selected element is not rendered on the web page.

Check these guides to have a better understanding of when to use Vitest matchers and Jest-DOM matchers.

Using Different Queries Methods with Vitest in Next.js
..ByText(): Useful when you need to find an element based on its contents, which are texts only. You can match a text either with the use of a string or a regular expression (regex). Regex helps to handle case-sensitive values.
For example,


// with regex
screen.getByText(/australian open/i)

// with string
screen.getByText('Australian Open')
..ByRole(): Role defines the purpose, layout or appearance of an element, such that it can be easily understood by assistive technologies. When you use the ..ByRole query method, you can interact with a node based on its accessible name. Other examples of matchers that can be found by roles include: generic, heading, img, button, tab, textbox, and dialog.
For example, in the app/sports/tennis/page.jsx component:


// app/sports/tennis/page.jsx

export default function Tennis() {

    return(
        <div>
            <h1>Tennis</h1>
            <h2>The modern tennis game is played in singles (one player versus another), doubles (teams of two), and mixed doubles (mixed gender teams) and features a scoring system across international events.</h2>
            <h3>Tennis has a long history, but the birth of the game played is thought to have taken place in England.</h3>

            <h4>The Grand Slams:</h4>
            <ul className='grand-slam--lists'>
                <li>Australian Open</li>
                <li>French Open</li>
                <li>Wimbledon</li>
                <li>US Open</li>
            </ul>

            <div>
                <button role='tab' aria-busy='false' >Learn how to play</button>
                <button role='tab' aria-busy='false'>Watch Games</button>
                <button role='tab' aria-busy='true'>Buy Ticket</button>
                <button role='tab' aria-busy='false'>Find a team mate</button>
            </div>

            <div>
                <h4>How to play:</h4>
                <p>The players face each other on the opposite sides of the net.</p>
                <p>The ball is played back and forth over the tennis.</p>
            </div>

            <h4>The tennis court is a firm rectangular surface with a low <span role="textbox">net</span> stretched across the centre.</h4>
        </div>
    )
}
Create a tennisPage.test.jsx file inside the all-tests/unit-tests folder:


// tennisPage.test.jsx

import {test, expect } from 'vitest'
import {render, screen, within } from '@testing-library/react'

import Tennis from '../../app/sports/tennis/page'

render(<Tennis/>)

test('heading element with the word: the modern tennis, contains the word: game', () => {
    // query heading element by role and filter based on its level and text name
    const tennisDescription = screen.getByRole('heading', { level: 2, name: /the modern tennis/i })
    expect(tennisDescription).toHaveTextContent('game')
})

test('tennis game history includes the word: england', () => {
    const tennisHistory = screen.getByRole('heading', { level: 3, name: /history/i })
    // query child element by text
    const country = within(tennisHistory).getByText(/england/i )
    expect(tennisHistory).toContain(country)

    expect(tennisHistory).not.toHaveTextContent(/france/i)
})

test('tennis rule includes the words: singles, doubles, and mixed doubles', () => {
    const tennisRule = screen.getByRole('heading', { level: 2, name: /tennis game is played in/i })
    expect(tennisRule).toHaveTextContent(/singles/i)
    expect(tennisRule).toHaveTextContent(/doubles/i)
    expect(tennisRule).toHaveTextContent(/mixed doubles/i)
})

test('grand slam has four tournaments', () => {
    // query list items
    const grandSlam = screen.getAllByRole('listitem')
    expect(grandSlam).toHaveLength(4)
})

test('the buy ticket button is active', () => {
    // query elements based on aria states and filter based on aria attributes
    const activeButton = screen.getByRole('tab', { busy: true })
    expect(activeButton).toHaveTextContent(/buy ticket/i)
})

test('tennis court description includes the word net', () => {
    // query nested element from the parent element
    const tennisCourt = screen.getByRole('heading', { level: 4, name: /the tennis court is a/i })
    const tennisCourtItem = within(tennisCourt).getByRole('textbox')
    expect(tennisCourtItem).toHaveTextContent(/net/i)
})
..ByLabelText(): Used to query input elements based on their label texts. For example,

<label>Username <input type='text' /></label>

<label htmlFor='username'>Username</label><input type='text' id='username' />

<label id='username'>Username</label<input type='text' aria-labelledby='username' />

<input aria-label='Username' type='text' />
All the input elements can be queried individually in the same way using: screen.getByLabelText(/username/i)

..ByAltText(): Used to query image elements based on their alt texts. For example,

// app/tennisImage/page.jsx

import Image from "next/image"

import tennisImage from '../../public/tennisImage.png'

export default function TennisImage() {
    // ...

    return(
        <div>
            <Image
                aria-label='a new tennis image'
                src={tennisImage}
                alt='a tennis player, wearing a white shirt and a white shorts.'
                width={600}
                height={600}
            />
        </div>
    )
}
Query the tennis image by using screen.getByAltText(/a tennis player/i) and screen.getByRole('img', {name: /a new tennis image/i }):


// tennisImage.test.jsx

import {test, describe, expect } from 'vitest'
import {render, screen, within } from '@testing-library/react'

import TennisImage from '../../app/tennisImage/page'


render(<TennisImage/>)


test('query image by role', () => {
    const image = screen.getByRole('img', {name: /a new tennis image/i })
    expect(image).toBeInTheDocument()
})

test('query image by alt-text', () => {
    const image = screen.getByAltText(/a tennis player/i)
    expect(image).toBeInTheDocument()
})
..ByTestId(): When other query methods seem to be unable to work for you, you can search for an element by setting its data-testid attribute. For example:

<div data-testid='french-cuisine'>French Cuisine: Escargots, Macarons, Coq au vin, French onion soup.</div>

<div data-testid='italian-cuisine'>Italian Cuisine: Margarita, Lasagna, Fettucini Alfredo, Bruschetta.</div>
Using getByTestId():


// French cuisine
screen.getByTestId('french-cuisine')

// Italian cuisine
screen.getByTestId('italian-cuisine')
Other query methods
..ByPlaceholderText(): Used to query the placeholder texts of an input element.
For example,


<input type='email' placeholder='Enter your email address' />

screen.getByPlaceholderText(/enter your email address/i )
..ByDisplayValue(): Used to query input, textarea, or select elements. For example,

<input aria-label='Well done' type='text' />

<textarea>Well done</textarea>

<select>
    <option>Well done</option>
</select>
Query all the display values of the elements using: screen.getAllByDisplayValues(/well done/i )

..ByTitle(): Used to query elements with title attributes or title elements. For example,

<span title='watch' id='2'></span>

<svg><title>profile image</title><g><path /></g></svg>
Query the titles by using:


screen.getByTitle('watch')
screen.getByTitle('profile image')
Testing User Interaction in Next.js Client Components with Vitest
Create a app/cuisine/page.jsx client component that updates the user interface based on the clicked buttons:


// app/cuisine/page.jsx

'use client'

import { useState } from "react"
import './cuisine.css'

export default function Cuisine() {

    const [italianCuisine, setItalianCuisine] = useState(false)
    const [frenchCuisine, setFrenchCuisine] = useState(false)


    function italianCuisineHandler() {
        setItalianCuisine(true)
        setFrenchCuisine(false)
    }

    function frenchCuisineHandler() {
        setFrenchCuisine(true)
        setItalianCuisine(false)
    }


    return (
        <main>

            <h3>Click on your desired cuisine</h3>

            <div className='buttons'>
                <button onClick={italianCuisineHandler} className='italianButton'>Italian Cuisine</button>
                <button onClick={frenchCuisineHandler} className='frenchButton'>French Cuisine</button>
            </div>


            { italianCuisine && (
                <div className='italianCuisine'>
                    <h2>Italian Cuisine</h2>

                    <h4>Margarita</h4>
                    <h4>Lasagna</h4>
                    <h4>Fettucini Alfredo</h4>
                    <h4>Bruschetta</h4>
                </div>
            )}

            { frenchCuisine && (
                <div className='frenchCuisine'>
                    <h2>French Cuisine</h2>

                    <h4>Escargots</h4>
                    <h4>Macarons</h4>
                    <h4>Coq au vin</h4>
                    <h4>French onion soup</h4>
                </div>
            )}
        </main>
    )
}
To test the client component, create a cuisinePage.test.jsx file inside the all-tests/vitest-unit-tests folder:


// cuisinePage.test.jsx

import {test, expect } from 'vitest'
import {render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import Cuisine from '../../app/cuisine/page'

render(<Cuisine />)


test('italian cuisines are displayed when italian cuisine button is clicked', async () => {
    const user = userEvent.setup()

    const italianButton = screen.getByRole('button', { name: /italian/i })

    await user.click(italianButton)

    expect(screen.getByText(/Margarita/i)).toBeInTheDocument()
    expect(screen.getByText(/Lasagna/i)).toBeInTheDocument()
    expect(screen.getByText(/Fettucini Alfredo/i)).toBeInTheDocument()
    expect(screen.getByText(/Bruschetta/i)).toBeInTheDocument()
    expect(screen.getByText(/Margarita/i)).toBeInTheDocument()
})


test('french cuisines are displayed when french cuisine button is clicked', async () => {
    const user = userEvent.setup()

    const frenchButton = screen.getByRole('button', { name: /french cuisine/i })  

    await user.click(frenchButton)

    expect(screen.getByText(/Escargots/i)).toBeInTheDocument()
    expect(screen.getByText(/Macarons/i)).toBeInTheDocument()
    expect(screen.getByText(/Coq au vin/i)).toBeInTheDocument()
    expect(screen.getByText(/French onion soup/i)).toBeInTheDocument()
})
In the cuisinePage.test.jsx file, we imported userEvent and called the setup method using userEvent.setup(). setup() allows us to call multiple user interaction methods that share the same input device state.

Other methods that can be called from userEvent() include:


import userEvent from '@testing-library/user-event'

const user = userEvent.setup()

// Press the Shift key without releasing it
await user.keyboard('[ShiftLeft>]') 

// Perform a click while the shift key is still pressed
await user.click(element) 
You can select options using:


import userEvent from '@testing-library/user-event'

const user = userEvent.setup()

// ...

await user.selectOptions(screen.getByRole('listbox'), ['1', 'C'])
You can upload files using: user.upload(), type a text using: user.type(), clear an editable element using: user.clear(). Read this guide for a complete understanding of userEvent utilities and how to use them.

Next.js End-to-End Testing with Playwright
In the previous section of this article, we wrote unit tests for our client components and synchronous server components using Vitest with React Testing Library. In this section, we will be writing End-to-End (e2e) tests for our asynchronous server components using Playwright. End-to-End tests involve the entire flow of the processes that are encountered in an application. For example, all the workflows involved in a login process.

Setup and Installation
In this article, we already have an existing Next.js project. Install Playwright Test by running the command on your terminal:


npm init playwright@latest
# or
yarn create playwright@latest
# or
pnpm create playwright
Once you run the Playwright installation command above, you will be prompted with a set of questions that you need to provide with responses. Remember that the project in this article is written in JavaScript. For the prompt: where do you want to put your end-to-end tests, provide the response: all-tests/e2e-tests. This will enable you to save all your e2e tests in the same folder. Alternatively, in the playwright.config.js|ts file that is created after the installation is complete, you can manually specify the folder you want to save all your e2e tests by changing the testDir value to your preferred folder:


// playwright.config.js

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './all-tests/e2e-tests',
  // ...
})
Inside the all-tests/e2e-tests folder, you will have an automatically created example.spec.js test file. We will be saving all our other e2e test files with a .spec extension.

Running End-to-End Tests
Run your playwright tests with any of these commands on your terminal:


npx playwright test
# or
yarn playwright test
# or
pnpm exec playwright test
To run a specific test file, use the command: npx playwright test [your-file-name]. You can also run multiple test files that are saved in separate folders using this command as an example: npx playwright test [e2e-tests/folder1] [e2e-tests/folder2]. To re-run failed tests, use the command: npx playwright test --last-failed.

You can receive a visual report about your tests and have a better understanding of the processes involved while running your tests by using the command: npx playwright test --ui on your terminal. It enables you to run your tests in a UI mode. Click the triangle icon on the sidebar to run each test.

Before running your Playwright tests, ensure that the local development server is running in a separate terminal with the npm run dev command. Or, if you want to avoid running the development server manually, include the address of your local development server in the webServer field as shown in the playwright.config.js file below:


// playwright.config.js

const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  // ...

  projects: [
    // ...
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
});
Configuring Playwright Browsers or Projects
End-to-end tests involve setting up a browser for a complete workflow process. In Playwright, browsers are also known as projects. Inside the playwright.config.js|ts file shown below, it can be confirmed that the three browsers where you can simulate your e2e tests are Chromium, Firefox, and Webkit.


// playwright.config.js

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    // ...
    
    projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  // ...
})
You can install other browsers or projects using the command: npx playwright install msedge for example to install Microsoft Edge or npx playwright install chrome to install Google Chrome. If you want to gain a better understanding of other browsers that can equally be installed, check this guide.

To run your test with a single browser, use the --project flag in your command: npx playwright test --project=[browser-name] or, npx playwright test --project=[browser-name-1] --project=[browser-name-2] for multiple browsers.

Declaring Playwright Semantic Checking Directives
Playwright allows you to run your tests with directives that can be declared to check semantics and errors. These directives are optional in terms of usage, and they include:

// @ts-check: allows semantic checking in JavaScript and must be declared at the top level of a test file.
// @ts-nocheck: Disables semantic checking in a JavaScript file and must be declared at the top level of a test file.
// @ts-ignore: ignores the error feedback that is determined by // @ts-check, and must be declared on the line directly before the encountered error feedback.
// @ts-expect-error: specifies that the test should expect and ignore more than one semantic error feedback that is determined by // @ts-check, and must be declared on the line directly before the encountered error feedback.
Skipping Tests
To skip a test, use test.skip(). For example,


test.skip('this test will be skipped', async ({page}) => {
    // ...
})
Alternatively, you can skip a test based on specified conditions. For example, the test will be skipped if this condition is true:


test('this test will be skipped', async ({page}) => {
    test.skip(browserName === 'firefox', 'Still working on it')
    // ...
})
Running Specific Tests only
To focus on the execution of a specific test among other tests in a test file, use test.only(). For example,


test.only('this test will be focused on during tests execution', async ({page}) => {
    // ...
})
Grouping Tests
You can group multiple tests that have similar purposes by using test.describe(). For example,


test.describe("grouped test", () => {
  test("test 1", async ({ page }) => {
    // ...
  });

  test("test 2", async ({ page }) => {
    // ...
  });

  test("test 3", async ({ page }) => {
    // ...
  });
});
Speed up Tests Execution by Specifying Timeouts
Playwright tests are executed within a timeout of 30 seconds for tests and 5 seconds for assertions. In some cases, tests may need to take a longer time before they are executed completely; you can specify the timeout by using any of these techniques:

Specify the timeout for a single test: You can change the timeout for a single test by using test.setTimeout(). For example,
import { test, expect } from '@playwright/test';

test('slow test', async ({ page }) => {
  test.slow(); // Easy way to triple the default timeout
  // ...
});

test('very slow test', async ({ page }) => {
  test.setTimeout(120_000);
  // ...
});
Specify the timeout for assertions: You can change the timeout for a single assertion by using timeout as shown in the example below:
import { test, expect } from '@playwright/test'
    
test('example', async ({ page }) => {
    await expect(locator).toHaveText('hello', {timeout: 10_000})
})
Specify the timeout in the playwright.config file: You can set the same timeouts for multiple tests and multiple assertions in the playwright.config file as shown below:
import { defineConfig } from '@playwright/test'

export defaultConfig({
    // test timeout sets to 120 secs
    timeout: 120_000,
    
    // expect timeout sets to 10 secs
    expect: {
    timeout: 10_000,
    }
})
Specify the timeout in beforeEach hook: To indicate the timeout in the beforeEach hook, use testInfo.setTimeout():
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, testInfo }) => { 
    // extend timeout for all tests running this hook by 30 secs
    testInfo.setTimeout(testInfo.timeout + 30_000)
})
Specify the timeout in beforeAll and afterAll hooks: To indicate the test timeout while using either the beforeAll or afterAll hook in your test file, use test.setTimeout():
import { test, expect } from '@playwright/test';

test.beforeAll(async () => {
    // set timeout for this hook
    test.setTimeout(60000)
})
When using beforeAll and afterAll hooks separately in your test file, call testInfo.setTimeout() inside each hook. For example,
import { test, expect } from '@playwright/test';

test.beforeAll(async () => {
    // extend timeout for all tests running this hook by 60 secs
    testInfo.setTimeout(testInfo.timeout + 60_000)
})

test.afterAll(async () => {
    // extend timeout for all tests running this hook by 80 secs
    testInfo.setTimeout(testInfo.timeout + 80_000)
})
Writing Playwright Tests in Next.js
For example,


test('how to write playwright tests', async ({ page }) => {
    // ...
    page.goto('/homePage')
})
The { page } argument passed into the async function above is a test fixture that isolates the page for each test run and provides methods to interact with a single tab in a browser. Other arguments that may be passed into the async function include:

browser: can be used to create a new page.
context: provides a way to operate multiple independent browser context.
chromuim, webkit, firefox : specifies the name of the browser currently running the test.
request: enables API requests. For example:

test('network request', async ({ request }) => {
    // ...
    const response = request.get()
})
The example below demonstrates how to create a new page from a browser's context. This is because we are using the browser test fixture:


test('using browser to create context and page', async ({ browser }) => {
    // create a new incognito browser context
    const context = await browser.newContext()
    // create a new page inside context
    const page = await context.newPage()
    await page.goto('127.0.0.1/aboutPage')
    // closes it once it is no longer needed
    await context.close()
    
    // ....

    context.close()
})
In the examples below, we want to run an end-to-end test against our /sample page, to confirm that when the link on the sample page is clicked, we are redirected to the /players page.

Create a app/sample/page.jsx file:


// app/sample/page.jsx

import Link from "next/link"

export default function Sample() {
    return(
        <main>
            <h3><Link href='/players'>Meet the players</Link></h3>
        </main>
    )
}
Next, create a app/players/page.jsx file:


// app/players/page.jsx

export default function Players() {

    return(
        <main>
            <h2>Our awesome players</h2>

            <div>
                <h4>Activities with teams:</h4>
                <p>Sign up</p>
                <p>Find a team mate</p>
                <p>Switch with another team</p>
            </div>
            
            <div>
                <h4>Activities with players:</h4>
                <p>Learn from players</p>
                <p>Speak with players</p>
                <p>Compete with players</p>
                <p>Write to players</p>
            </div>

            <div>
                <h4>All players</h4>
                <ul>
                    <li>Player A</li>
                    <li>Player B</li>
                    <li>Player C</li>
                    <li>Player D</li>
                </ul>
            </div>

        </main>
    )
}
Create an e2eSampleTest.spec.js file inside the all-tests/e2e-tests folder. This test visits the sample page, locates the link element, clicks on the locator, and then waits for the player's page URL to load before confirming that the current page is equal to the player's page URL. //@ts-check performs semantic checking:


// all-tests/e2e-tests/e2eSampleTest.spec.js


//@ts-check

import { test, expect } from '@playwright/test'


test('should redirect to players page', async ({ page }) => {

    // visit sample page url
    await page.goto('/sample')

    // locate heading element
    const heading = page.getByRole('heading')

    // locate link element from heading locator
    await heading.getByText('Meet the players', { exact: true }).click()

    // wait for players url to load
    await page.waitForURL(/.*\/players/)

    // assert that the current page url is exactly the players url 
    await expect(page).toHaveURL(/.*\/players/)

})
Run the e2eSampleTest.spec.js test file by using the command npx playwright test e2eSampleTest.spec.js on your terminal.

Writing Playwright Tests in Nextjs.png

Here, we want to run the e2eSampleTest.spec.js file with UI mode by using the command below:


npx playwright test --ui e2eSampleTest.spec.js
Ui Mode Testing.png

Interacting with a Tab in a Browser: page Test Fixture
In the e2eSampleTest.spec.js file above, the two arguments that are called inside the test() function are: the test name and an async function. Inside the async function, the { page } argument allows you to interact with a single tab in a browser. page.goto() visits the URL of the page we want to test.

Other page methods include: page.content() which returns all the contents in a tab including the doctype contents, page.goBack() returns the previous page that was visited before the current page, page.reload() reloads the current page, page.screenshot() returns the captured screenshot on the page.

You can simulate a web page with methods such as page.clock(), page.coverage(), page.mouse(), page.request(), page.touchscreen(). You can handle events with the page.on() method. Read more about how to use other page methods.

Finding Elements Directly from page or with The use of Locators
You can find elements from a web page by using any of the seven page.getBy... methods: getByAltText(), getByLabel(), getByPlaceholder(), getByRole(), getByTestId() getByText(), getByTitle(). Or, by using page.locator() method. page.locator() accepts the name of an element as an argument.

The example below shows how to locate elements using different locator methods:


await page.locator('h1')
await page.locator('li')

await page.getByRole('heading')
await page.getByRole('listitem')
await page.getByRole('link')

// locate element based on its exact value
await page.getByText('this value can be found', { exact: true })

const locatedElement = page.getByText('this is a parent element')

// locate child element
await page.locator(locatedElement).getByText('this is a child element')
await locatedElement.getByText('this is a child element')

// locate div element and filter based on its specific text
await page.getByRole('generic').filter( { hasText: 'this text can be found' })

// locate div element and filter based on its child element
await page.getByRole('generic').filter({ has: page.getByRole('listitem')})
Performing Actions on Locators in Next.js
You can perform actions such as click(), press(), blur(), and check() on Locators. Read this guide to have a complete list of possible actions that can be performed on locators.

For example:


<input aria-label="email">

<label htmlFor="password-input">Password:</label>
<input id="password-input">
You can fill the input elements using locator.fill() method:


page.getByLabel('email').fill('example@email.com')
page.getByLabel('Password').fill('mypassword')
Making Assertions with expect() Method
To assert your test and confirm that the located elements can be found on the page, use the expect() method. For example: expect(locatedElement).toBeVisible(), toHaveText(), toBeChecked(), toContainText(),toHaveCount(), toHaveValue() for input, toHaveValues for multiple select options, toHaveURL() for page URL, toHaveTitle() for page title, toBeOK() for API response OK status. Read more about Playwright assertion methods.

Here, we want to test app/players/page.jsx, which we previously wrote in this article. Create a playersPage.spec.js test file in the all-tests/e2e-tests file:


// playersPage.spec.js

import { test, expect } from '@playwright/test'


test('locate heading element by role', async ({ page }) => {
    await page.goto('/players')

    const headingA = page.getByRole('heading').filter( { hasText: 'Our awesome' } )
    await expect(headingA).toContainText('players')
})


test('locate heading element by exact text', async ({ page }) => {
    await page.goto('/players')

    const headingB = page.getByText('Activities with teams:', { exact: true })
    await expect(headingB).toBeDefined()
})


test('locate paragraph element', async ({ page }) => {
    await page.goto('/players')

    const playerActivities = page.locator('.activities-with-players').getByRole('paragraph')

    await expect(playerActivities).toContainText(['Learn', 'Speak', 'Compete', 'Write'])
})


test('locate list items as a child element', async ({ page }) => {
    await page.goto('/players')

    const parentElement = page.locator('.all-players')

    const allPlayersLists = parentElement.getByRole('listitem')
  
    await expect(allPlayersLists).toHaveCount(4)
    await expect(allPlayersLists).toContainText(['A', 'B', 'C', 'D'])
})
How to Test Async Server Components Fetching Data from an API in Next.js
The olympics/page.jsx file below is an async server component that performs data fetching directly from the olympics api. Create the olympics api inside app/api/olympics/route.js api route handler:


// app/api/olympics/route.js

import { NextResponse } from "next/server";

export async function GET(request) {
  return NextResponse.json(
    [
      {
        id: "1",
        name: "Golf",
        about:
          "Golf is a sport where the idea is to hit a ball with a club from the tee into the hole in as few strokes as possible.",
        rules:
          "The essential rule of golf is, for each stroke, the player to play the ball as it lies, and the course as they find it.",
      },
    ],
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
The olympics API executes a GET request and is fetched directly inside the app/olympics/page.jsx async server component:


// app/olympics/page.jsx

export default async function Olympics() {
  const response = await fetch("http://127.0.0.1:3000/api/olympics");
  const results = await response.json({});

  return (
    <main>
      <h1>The olympics</h1>

      {results.map((result) => {
        return (
          <div key={result.id}>
            <h2>{result.name}</h2>
            <p>{result.about}</p>
            <p>{result.rules}</p>
          </div>
        );
      })}
    </main>
  );
}
Create an olympicsPage.spec.js file directly inside your all-tests/e2e-tests folder.


// olympicsPage.spec.js

import { test, expect } from "@playwright/test";

// MOCK API REQUEST

test("mock the olympics api", async ({ page }) => {
  // mock the api call before navigating
  page.route("http://127.0.0.1:3000/api/olympics", async (route) => {
    const json = {
      id: "2",
      name: "Archery",
      about:
        "Archery is one of the oldest sports still practised, and is closely linked to the development of civilisation. Using bows and arrows, the sport has a history dating back thousands of years.",
      rules:
        "That depends on the type of archery being practised as sport, with different disciplines and rules regarding the type of bow that can be used. At the Olympics, outdoor target archery is practised with recurve bows.",
    };
    await route.fulfill({ json });
  });

  // go to the olympics page
  await page.goto("/olympics");

  // assert that certain words are visible
  await expect(page.getByText(/the olympics/)).toBeDefined();
  await expect(page.getByText(/Using bows and arrows/)).toBeDefined();
});

// MODIFY API RESPONSES

test("modify the olympics api", async ({ page }) => {
  // get the response and add to it
  await page.route("http://127.0.0.1:3000/api/olympics", async (route) => {
    // make network request
    const response = await route.fetch();
    const json = await response.json();

    json.push({
      id: "3",
      name: "Swimming",
      about:
        "Swimming at the Olympics is both an individual and team sport where competitors propel their bodies through water in either an outdoor or indoor swimming pool using one of the following strokes: Freestyle, backstroke, breaststroke, or butterfly.",
      rules:
        "Athletes race using one of four strokes - freestyle, backstroke, breaststroke and butterfly - or all of them in the individual medley (IM) events.",
    });

    // fulfill using the original response, while patching the response body with the given JSON object.
    await route.fulfill({ response, json });
  });

  // go to the olympics page
  await page.goto("/olympics");

  // assert that certain words are visible
  await expect(page.getByText(/the olympics/)).toBeDefined();
  await expect(
    page.getByText(/propel their bodies through water/),
  ).toBeDefined();
});
In the olympicsPage.spec.js file above, we implemented our e2e testing in two ways: by mocking the API, and by modifying the API. Let us understand the process involved in:

Mocking the API: We simulated the Olympics API, which does not involve a direct network request, and fulfilled the API with mocked data, then visited the page URL and asserted that the page renders data from the fulfilled API.
Modifying the API: In this process, we made an API request, and patched new data to the original response while fulfilling the API, then visited the URL and asserted that the data was visible.
Testing Next.js Components That Fetch and Update Data via Server Actions
You can also test other NextJs components using Playwright. The ticketSales/page.jsx file below is a client component that fetches data directly from the user interface with the help of the ticketSalesAction.js server action.

Create a buyTicket server action inside app/ticketSales/ticketSalesAction.js file:


// app/ticketSales/ticketSalesAction.js

"use server";

export async function buyTicketAction(prevState, formData) {
  const ticketSalesData = {
    ticketType: formData.get("ticketType"),
  };

  const newTicketType = await ticketSalesData.ticketType;

  // data mutation

  if (
    newTicketType === "regular" ||
    newTicketType === "vip" ||
    newTicketType === "vvip"
  ) {
    return `an exquisite ${newTicketType} ticket`;
  }

  return "an invalid ticket";
}
Call the buyTicketAction inside app/ticketSales/page.jsx:


// app/ticketSales/page.jsx

"use client";

import { useActionState } from "react";
import { buyTicketAction } from "./ticketSalesActions";

export default function TicketSales() {
  const [formState, formAction] = useActionState(buyTicketAction);

  return (
    <main style={{ fontSize: "36px" }}>
      <form action={formAction}>
        <label htmlFor="ticket-type" aria-label="ticket-type">
          Ticket Type
        </label>
        <input
          type="text"
          id="ticket-type"
          name="ticketType"
          required
          placeholder="are you buying a regular, VIP, or VVIP ticket?"
          style={{
            border: "1px solid black",
            display: "block",
            fontSize: "16px",
            width: "500px",
            margin: "20px 0",
            padding: "5px",
          }}
        />

        <button
          type="submit"
          style={{
            backgroundColor: "black",
            color: "white",
            fontSize: "20px",
            padding: "5px",
          }}
        >
          Buy Ticket
        </button>
      </form>

      <div>
        <h1>
          Congratulations! You are rewarded with{" "}
          <span style={{ backgroundColor: "thistle", padding: "2px" }}>
            {formState}
          </span>
          . Enjoy the games and have fun!
        </h1>
      </div>
    </main>
  );
}
Create a ticketSalesPage.spec.js file inside the all-tests/e2e-tests folder:


// ticketSalesPage.spec.js

// @ts-check

import { test, expect } from "@playwright/test";

test("ticket sales page updates with the accepted ticket type response", async ({
  page,
}) => {
  await page.goto("/ticketSales");

  // @ts-ignore
  // const validTicketResponse = 'regular' || 'vip' || 'vvip'

  await page.getByLabel("ticket-type").fill("regular");
  await page.getByRole("button", { name: "Buy Ticket" }).click();

  const validTicketStatus = page.getByRole("heading");
  await expect(validTicketStatus).toContainText("an exquisite regular ticket");
});

test("ticket sales pages updates invalid ticket type response", async ({
  page,
}) => {
  await page.goto("/ticketSales");

  await page.getByLabel("ticket-type").fill("invalid ticket");
  await page.getByRole("button", { name: "Buy Ticket" }).click();

  const invalidTicketStatus = page.getByRole("heading");
  await expect(invalidTicketStatus).not.toContainText("an exquisite VIP");
  await expect(invalidTicketStatus).toContainText("invalid ticket");
});
Best practices when writing tests
It is recommended that you proactively decide on the values you want to assert before you start writing tests. This will help you reduce the time it takes to execute your tests successfully and prevent you from re-writing your tests multiple times while thinking about what values to test and not to test.
Write clean tests. Use precise query methods and locators. Ensure that you isolate your tests based on the purpose of each test. This will also help you to have a better understanding of error messages you may encounter while the tests do not have to depend on one another.
Assert your tests with methods that return values that are as precise and accurate as they are expected. This helps to avoid writing flaky tests.