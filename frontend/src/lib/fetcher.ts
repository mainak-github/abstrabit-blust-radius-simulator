export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error("Request failed");
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
};
