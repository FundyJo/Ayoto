// apolloClient.ts
import {ApolloClient, ApolloProvider, createHttpLink, InMemoryCache, makeVar,} from '@apollo/client';
import {setContext} from '@apollo/client/link/context';
import {onError} from '@apollo/client/link/error';
import {buildAuthUrl, fetchUserData, UserData} from '../index.ts';
import {ReactNode, useEffect} from 'react';

// Reactive variables for user authentication state
const isLoggedInVar = makeVar<boolean>(false);
const userDataVar = makeVar<UserData | null>(null);

const httpLink = createHttpLink({
  uri: 'https://graphql.anilist.co', // Update to your GraphQL server URL
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
  }

  if (networkError) console.error(`[Network error]: ${networkError}`);
});

const client = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache(),
});

// Functions for handling authentication
async function login() {
  try {
    // GET-Anfrage an den CSRF-Token-Endpunkt
    const response = await fetch('http://localhost:3001/get-csrf-token', {
      method: 'GET',
    });

    // Extrahiere den CSRF-Token aus der Antwort
    const { json } = await response.json();

    // Baue die Auth-URL mithilfe des Tokens
    // Navigiere zur Authentifizierungs-URL
    window.location.href = buildAuthUrl(json.data.csrfToken);

  } catch (error) {
    console.error('Error fetching CSRF token or building auth URL:', error);
  }
}

function logout() {
  localStorage.removeItem('accessToken');
  isLoggedInVar(false);
  userDataVar(null);
  window.location.href = '/profile'; // Adjust as necessary
  window.dispatchEvent(new CustomEvent('authUpdate'));
}

function handleAuthUpdate() {
  const token = localStorage.getItem('accessToken');
  if (token) {
    fetchUserData(token)
      .then((data) => {
        userDataVar(data);
        isLoggedInVar(true);
      })
      .catch((err) => {
        console.error('Failed to fetch user data:', err);
        logout(); // Ensures clean state on failure
      });
  } else {
    isLoggedInVar(false);
    userDataVar(null);
  }
}

export const ApolloClientProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    window.addEventListener('authUpdate', handleAuthUpdate);
    handleAuthUpdate();
    return () => {
      window.removeEventListener('authUpdate', handleAuthUpdate);
    };
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

export {
  client as defaultApolloClient,
  login,
  logout,
  isLoggedInVar,
  userDataVar,
};
