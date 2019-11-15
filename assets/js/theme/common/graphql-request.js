/**
 * Run an arbitrary GraphQL query
 */
export default function (token, query, callback) {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.open('POST', '/graphql');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = () => {
        callback(xhr.response);
    };

    xhr.send(JSON.stringify(query));
}
