import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";

type Mail = { to: string; subject: string; text: string };

const DIR = path.join(process.cwd(), "tmp", "mail");

async function readAll(): Promise<Mail[]> {
  const files = (await readdir(DIR).catch(() => [])).sort();
  return Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(DIR, file), "utf8"))));
}

// Waits for the newest email to `to` with a matching subject and returns its first link.
export async function linkFromLatestMail(to: string, subject: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(async () => {
      const mail = (await readAll()).findLast((item) => item.to === to && item.subject === subject);
      link = mail?.text.match(/https?:\/\/\S+/)?.[0];
      return link;
    })
    .toBeTruthy();
  return link!;
}
