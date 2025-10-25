# PURPOSE

This is your team's repo for the ESN Application, the group project conducted in 18652.

# IMPORTANT RULES

- YOU ARE _NOT_ PERMITTED TO SHARE THIS REPO OUTSIDE THIS GITHUB ORG.
- YOU ARE _NOT_ PERMITTED TO FORK THIS REPO UNDER ANY CIRCUMSTANCES.
- YOU ARE _NOT_ PERMITTED TO CREATE ANY PUBLIC REPOS INSIDE THE GITHUB ORGANIZATION YOUR REPO RESIDES.
- YOU SHOULD HAVE LINKS FROM THIS README FILE TO YOUR PROJECT DOCUMENTS, SUCH AS YOUR REST API SPECS AND YOUR ARCHITECTURE DOCUMENT.
- YOUR GITHUB ACCOUNT'S PRIMARY EMAIL MUST BE ASSOCIATED WITH YOUR ANDREW EMAIL.
- YOUR GITHUB PROFILE MUST BE PUBLIC AND SHOULD HAVE YOUR FULL NAME AND RECOGNIZABLE HEADSHOT PHOTO.
- MAKE SURE TO CHECK AND UPDATE YOUR LOCAL GIT CONFIGURATION IN ORDER TO MATCH YOUR LOCAL GIT CREDENTIALS TO YOUR GITHUB CREDENTIALS USING IN THIS PROJECT (COMMIT USING YOUR ANDREW EMAIL ASSOCIATED WITH YOUR GITHUB ACCOUNT USED FOR THE COURSE): OTHERWISE YOUR COMMITS MAY BE EXCLUDED FROM GITHUB STATISTICS AND REPO AUDITS WILL UNDERESTIMATE YOUR CONTRIBUTION.
- YOUR MAIN BRANCH WILL BE PROTECTED. YOU WILL NOT BE ALLOWED TO PUSH DIRECTLY TO THIS BRANCH. MERGE INTO MAIN USING A PR. NO FORCE-PUSHES TO MAIN.

# Technologies:

- **HTML5 + Semantic Markup (with ARIA)**
    - **Reason**: Keep the view layer simple, accessible, and framework-free.
    - **Strengths**: Accessible by default, SEO-friendly, easy to learn/teach, lowest runtime overhead.
    - **Weaknesses**: Complex UI composition must be organized by team conventions (no component system baked in).

- **CSS (Vanilla CSS with BEM naming) + normalize.css**
    - **Reason**: Predictable, cross-browser base without adding a framework; BEM keeps styles modular.
    - **Strengths**: BEM prevents selector conflicts.
    - **Weaknesses**: No enforced module scoping like CSS-in-JS.

- **Bootstrap 5 (CDN) – limited use of layout/utilities/components**
    - **Reason**: Ship a clean baseline UI quickly without hand-rolling grids/forms.
    - **Strengths**: Battle-tested grid, utilities, and form styles; fast to prototype; good docs.
    - **Weaknesses**: Risk of “Bootstrap look”; unused CSS must be trimmed to avoid bloat.

- **JavaScript (ES6 Modules) + Browser Fetch API**
    - **Reason**: Modern browsers support modules and fetch, so we avoid heavy client frameworks. No need for JQuery.
    - **Strengths**: Native, fast, and portable; easy to reason about; no bundler required for simple apps.
    - **Weaknesses**: Manual DOM updates and state handling can get verbose on complex pages.

- **Express.js**
    - **Reason**: Generally used and lightweight within the Node.js ecosystem. It reduces the learning curve because the team is already familiar with JavaScript.
    - **Strengths**: Flexibility, a vast ecosystem, and ease of middleware extension.
    - **Weaknesses**: Inconsistent project organization due to unclear team conventions can result from minimal structure.

- **MongoDB with Atlas**
    - **Reason**: No need to learn SQL is lowers the learning curve. Atlas offers cloud storage of DB which makes the deployment and maintenance easier.
    - **Strengths**: Flexible schema, cloud scalability, and robust Node.js integration.
    - **Weaknesses**: A lack of enforced schema may lead to inconsistent data; some teammates are new to Atlas and need onboarding.

- **JSON Web Tokens (JWT)**
    - **Reason**: Facilitates stateless authentication, conforms to RESTful standards, circumvents server-side session storage, and facilitates scaling.
    - **Strengths**: Statelessness, scalability, broad support, and ease of integration with contemporary APIs.
    - **Weaknesses**: Needs careful management of token expiration and storage.

- **RESTful API**
    - **Reason**: Lightweight, well-documented, and familiar to all team members. Ensures clear separation of frontend and backend and simplifies integration with external systems.
    - **Strengths**: Simple, standardized, easy to test and integrate.
    - **Weaknesses**: Less efficient for highly dynamic or real-time applications.

## Documentation
