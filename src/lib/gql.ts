export async function gql(
  query: string,
  url: string,
  variables: any,
  headers: any,
) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      operationName: null,
      query,
      variables,
    }),
  });

  const data = await res.json();

  return data;
}
