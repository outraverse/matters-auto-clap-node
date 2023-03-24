const { GraphQLClient, gql } = require("graphql-request");
require("dotenv").config()

// Set up a GraphQL client with the URL of the GraphQL API endpoint
const client = new GraphQLClient("https://server.matters.news/graphql");

/***
 * log in the user from env variable. retrieve access token
 */
async function userLogin(userEmail, userPasswd) {
  token = ""
  const query = gql`
    mutation($userEmail: email_String_NotNull_format_email!, $userPasswd: String!) {
      userLogin(input: {
        email: $userEmail,
        password: $userPasswd
      }) {
        token
      }
    }
  `;
  // Set up the variables for the query
  const variables = {
    userEmail,
    userPasswd
  };
  try {
    const data = await client.request(query, variables);
    token = data.userLogin.token;
  }
  catch (error) {
    console.error(error);
  }
  return token
}

/***
 * log out the user from .env
 */
async function userLogout() {
  const query = gql`
    mutation {
      userLogout
    }
  `;
  // Set up the variables for the query
  try {
    const data = await client.request(query);
    flag = data.userLogout;
  }
  catch (error) {
    console.error(error);
  }
  return flag
}


/***
 * Retrive the total count of following users of a selected author
 */
async function FetchTotalCountFollowing(userName) {
  let totalCount = -1;
  const query = gql`
    query {
      user(input: {userName: "${userName}"}) {
        following {
          users(input: {first: 0}) {
            totalCount
          }
        }
      }
    }
  `;
  // Set up the variables for the query
  const variables = {
    userName,
  };
  // Call the query using the client
  try {
    const data = await client.request(query, variables);
    totalCount = data.user.following.users.totalCount;
  }
  catch (error) {
    console.error(error);
  }
  return totalCount
}

/***
 * retrive most recent article of select author
 */
async function fetchFirstArticle(userName) {
  const query = gql`
    query {
      user(input: { userName: "${userName}" }) {
        articles(input: { first: 1 }) {
          edges {
            node {
              id
              title
              createdAt
              mediaHash
              state
            }
          }
        }
      }
    }
  `;
  const variables = {
    userName
  };
  try {
    const data = await client.request(query, variables);
    const article = data.user.articles.edges[0];
    if (typeof article !== "undefined") {
      if (article.node.state === "active") {
        console.log(article.node)
        checkAppreciation(article.node.mediaHash, null, false)
      }
    }
    //console.log(article)
  }
  catch (error) {
    console.error(error);
  }
}


async function checkAppreciation(mediaHash, after, clapped) {
  const query = gql`
    query($mediaHash: String!, $after: String) {
      article(input: {mediaHash: $mediaHash}) {
        id
        title
        appreciationsReceived(input: {first: 10, after: $after}) {
          totalCount
          edges {
            node {
              amount
              sender {
                id
                userName
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;
  const variables = {
    mediaHash,
    after
  };
  try {
    const data = await client.request(query, variables);
    const pageInfo = data.article.appreciationsReceived.pageInfo
    const edges = data.article.appreciationsReceived.edges[0];
    const mineName = process.env.user
  
    // Read the data from edges array
    if (typeof edges !== "undefined") {
      for (let i in edges) {
        if (edges[i].sender.userName === mineName) {
          clapped = true
          break
        }
      }
      if (!clapped) {
        if (pageInfo.hasNextPage) {
          const nextPage = pageInfo.endCursor;
          checkAppreciation(mediaHash, nextPage, clapped)
        }
        else {
          sendAppriciation(data.article.id)
        }
      }
      else {
        console.log(`Article "${data.article.title}" has already been clapped.`)
      }
    }
    else {
      console.log("Empty edges")
    }
  } 
  catch (error) {
    console.error(error);
  }
}

/***
 * retrieve all followers' names from selected author
 */
async function FetchFollowingUsers(userName, first) {
  let users = [];
  // Set up the query
  const query = gql`
    query {
      user(input: {userName: "${userName}"}) {
        following {
          users(input: {first: ${first}}) {
            totalCount
            edges {
              node {
                id
                userName
                displayName
              }
            }
          }
        }
      }
    }
  `;
   // Set up the variables for the query
   const variables = {
    userName,
    first,
  };
  // Call the query using the client
  try {
    const data = await client.request(query, variables);
    const edges = data.user.following.users.edges;

    // Read the data from edges array
    edges.forEach((edge) => {
      //console.log(edge.node.id, edge.node.userName, edge.node.displayName);
      users.push(edge.node.userName);
    });
  }
  catch (error) {
    console.error(error);
  }
  return users
}

async function sendAppriciation(articleId) {
  const query = gql`
    mutation {
      appreciateArticle(input: {
        id: "${articleId}",
        amount: 5
      }) {
        id
        title
      }
    }
  `;
  // Set up the variables for the query
  const variables = {
    articleId,
  };
  // Call the query using the client
  try {
    const data = await client.request(query, variables);
    console.log(data)
    console.log(`You have just clapped the article "${data.appreciateArticle}" 5 times.`)
  }
  catch (error) {
    console.error(error);
  }
  return
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const userEmail = process.env.email
  const userName = process.env.user
  const userPasswd = process.env.passwd
  const token = await userLogin(userEmail, userPasswd);
  client.setHeader("x-access-token", token)
  //console.log("Token: ", token)
  // Call the function with the desired parameters
  const totalCount = await FetchTotalCountFollowing(userName);
  if (totalCount > 0) {
    const users = await FetchFollowingUsers(userName, totalCount);
    console.log("Followings")
    console.log(users)
    console.log("Total followings: ", users.length)
    if (users.length > 0) {
      for (let i in users) {
        await fetchFirstArticle(users[i])
        await sleep(5000)
      }
    }
  }
  else {
    console.log("Fetch Total Count error!")
  }
  //const logout = await userLogout()
  //console.log(logout)
}

main();
