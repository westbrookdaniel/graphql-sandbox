import * as Comlink from "comlink";

export async function run(input: string) {
  const pre = `importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");`;
  const suf = `Comlink.expose({ ENDPOINT, headers, variables })`;

  const file = pre + "\n" + input + "\n" + suf;

  const blob = new Blob([file], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  const obj: any = Comlink.wrap(worker);

  const endpoint = await obj.ENDPOINT;
  const headers = await obj.headers();
  const variables = await obj.variables();

  return { headers, endpoint, variables };
}
