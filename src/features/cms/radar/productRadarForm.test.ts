import { describe, expect, it } from "vitest";
import { defaultProductRadarCreateForm, validateProductRadarCreate } from "./productRadarForm";

describe("validateProductRadarCreate", () => {
  it("requires name and jql", () => {
    expect(validateProductRadarCreate({ name: "", jql: "" })).toEqual({ error: "Укажите название радара" });
    expect(validateProductRadarCreate({ name: "Портфель", jql: "  " })).toEqual({ error: "Укажите JQL-запрос" });
  });

  it("trims valid payload", () => {
    expect(validateProductRadarCreate({ name: "  Портфель  ", jql: " project = X " })).toEqual({
      name: "Портфель",
      jql: "project = X",
    });
  });
});

describe("defaultProductRadarCreateForm", () => {
  it("prefills jql template", () => {
    expect(defaultProductRadarCreateForm().jql).toContain("BTBMGLBL");
    expect(defaultProductRadarCreateForm().name).toBe("");
  });
});
