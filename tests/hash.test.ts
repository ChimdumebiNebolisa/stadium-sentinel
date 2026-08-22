import { describe, expect, it } from "vitest";
import { canonicalJsonString, canonicalVenue, sha256Hex } from "@/engine/fingerprint";

describe("sha256Hex (isomorphic implementation)", () => {
  it("matches the FIPS 180-4 known-answer vectors", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("handles multi-block messages and unicode consistently", () => {
    const long = "x".repeat(1000);
    expect(sha256Hex(long)).toHaveLength(64);
    expect(sha256Hex(long)).toBe(sha256Hex(long));
    expect(sha256Hex("stadium ✅ sentinel")).toHaveLength(64);
  });
});

describe("canonicalJsonString", () => {
  it("sorts object keys by code-unit order at every depth", () => {
    const a = canonicalJsonString({ b: 1, a: { d: 2, c: [ { z: 1, y: 2 } ] } });
    const b = canonicalJsonString({ a: { c: [ { y: 2, z: 1 } ], d: 2 }, b: 1 });
    expect(a).toBe(b);
    expect(a).toContain('{"a":{"c":[{"y":2,"z":1}],"d":2},"b":1}');
  });

  it("preserves array order (semantically meaningful)", () => {
    expect(canonicalJsonString([3, 1, 2])).toBe("[3,1,2]");
  });
});

describe("canonicalVenue", () => {
  it("sorts nodes by id and edges by (from, to, id)", () => {
    const venue = {
      id: "v",
      name: "V",
      nodes: [{ id: "n2" }, { id: "n1" }],
      edges: [
        { id: "e2", from: "a", to: "b" },
        { id: "e1", from: "a", to: "b" },
        { id: "e0", from: "a", to: "a2" },
      ],
    };
    const canon = canonicalVenue(venue);
    expect(canon.nodes.map((n) => n.id)).toEqual(["n1", "n2"]);
    expect(canon.edges.map((e) => e.id)).toEqual(["e0", "e1", "e2"]);
  });
});
