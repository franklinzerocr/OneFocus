import { describe, expect, it } from "vitest";

// Placeholder: en el siguiente step refactorizamos para poder mockear undici.request.
// Aquí solo comprobamos que el módulo existe y exporta la función.
import { clickupRequest } from "./http";

describe("clickup http", () => {
  it("exports clickupRequest", () => {
    expect(typeof clickupRequest).toBe("function");
  });
});
