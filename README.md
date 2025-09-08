# PURPOSE
This is your team's repo for the ESN Application, the group project conducted in 18652. 

# IMPORTANT RULES

- YOU ARE *NOT* PERMITTED TO SHARE THIS REPO OUTSIDE THIS GITHUB ORG. 
- YOU ARE *NOT* PERMITTED TO FORK THIS REPO UNDER ANY CIRCUMSTANCES.
- YOU ARE *NOT* PERMITTED TO CREATE ANY PUBLIC REPOS INSIDE THE GITHUB ORGANIZATION YOUR REPO RESIDES.
- YOU SHOULD HAVE LINKS FROM THIS README FILE TO YOUR PROJECT DOCUMENTS, SUCH AS YOUR REST API SPECS AND YOUR ARCHITECTURE DOCUMENT.
- YOUR GITHUB ACCOUNT'S PRIMARY EMAIL MUST BE ASSOCIATED WITH YOUR ANDREW EMAIL.
- YOUR GITHUB PROFILE MUST BE PUBLIC AND SHOULD HAVE YOUR FULL NAME AND RECOGNIZABLE HEADSHOT PHOTO. 
- MAKE SURE TO CHECK AND UPDATE YOUR LOCAL GIT CONFIGURATION IN ORDER TO MATCH YOUR LOCAL GIT CREDENTIALS TO YOUR GITHUB CREDENTIALS USING IN THIS PROJECT (COMMIT USING YOUR ANDREW EMAIL ASSOCIATED WITH YOUR GITHUB ACCOUNT USED FOR THE COURSE): OTHERWISE YOUR COMMITS MAY BE EXCLUDED FROM GITHUB STATISTICS AND REPO AUDITS WILL UNDERESTIMATE YOUR CONTRIBUTION.
- YOUR MAIN BRANCH WILL BE PROTECTED. YOU WILL NOT BE ALLOWED TO PUSH DIRECTLY TO THIS BRANCH. MERGE INTO MAIN USING A PR. NO FORCE-PUSHES TO MAIN. 

# Technologies: 
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


