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

// The advertised core action is "your phone RINGS" — i.e. the armed host gets
// an alert (screen flash) when a guest taps RING on the OTHER peer. The log
// test above only proves the entry replicates; this drives the full doorbell
// path and asserts the host's ring effect fires cross-peer.
test("armed host flashes when guest on the other peer rings", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // B is the host: arm it so a new ring triggers the chime + flash.
    await b.getByRole("button", { name: /arm/i }).click();
    await expect(b.locator(".bell-armed")).toBeVisible();
    // Host should not be flashing before any ring.
    await expect(b.locator("html")).not.toHaveAttribute("data-mesh-flash", "1");

    // A is the guest on the OTHER peer: ring the doorbell.
    await a.getByRole("button", { name: /at the door/ }).click();
    await a.getByPlaceholder(/who's at the door/).fill("courier");
    await a.getByRole("button", { name: /RING/ }).click();

    // The armed host's screen must flash in response to the cross-peer ring.
    await expect(b.locator("html")).toHaveAttribute("data-mesh-flash", "1");
    await expect(b.locator(".bell-log").getByText("courier")).toBeVisible();
  } finally {
    await cleanup();
  }
});
