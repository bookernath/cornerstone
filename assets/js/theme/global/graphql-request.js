import ApolloClient from 'apollo-boost';

/**
 * Using Apollo Client, run a given request against the GraphQL Storefront API and return a promise for the data.
 */
export default function runGraphQLQuery(token, query) {
    return new ApolloClient({
        headers: { Authorization: `Bearer ${token}` },
    }).query({ query })
        .catch(error => console.error(error));
}
