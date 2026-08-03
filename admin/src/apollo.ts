import { ApolloClient, InMemoryCache } from '@apollo/client';

const uri = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:3000/graphql';

export const apolloClient = new ApolloClient({
  uri,
  cache: new InMemoryCache(),
});
