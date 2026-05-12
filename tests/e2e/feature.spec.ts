import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("guest rings, host sees it in the log", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // A becomes the guest, B is host (default)
    await a.getByRole("button", { name: /at the door/ }).click();
    await a.getByPlaceholder(/who's at the door/).fill("postman");
    await a.getByRole("button", { name: /RING/ }).click();

    await expect(b.locator(".bell-log").getByText("postman")).toBeVisible();
  } finally {
    await cleanup();
  }
});
