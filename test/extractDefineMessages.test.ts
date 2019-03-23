import compile from "../compile";
import { resolve } from "path";
import { expect } from "chai";

describe("extractDefineMessages", function() {
  this.timeout(10000);
  it("should be able to extract messages with our macro", function() {
    expect(
      compile(resolve(__dirname, "fixture/defineMessage.ts"))
    ).to.deep.equal({
      "3nxZQB0eo3": {
        id: "3nxZQB0eo3",
        description: "description bar",
        defaultMessage: "defaultMessage bar"
      },
      jv83iiJolI: {
        id: "jv83iiJolI",
        description: "description foo",
        defaultMessage: "defaultMessage foo"
      }
    });
    const strings = require("./fixture/defineMessage.js");
    expect(strings.foo).to.deep.equal({
      id: "jv83iiJolI",
      defaultMessage: "defaultMessage foo"
    });
    expect(strings.bar).to.deep.equal({
      id: "3nxZQB0eo3",
      defaultMessage: "defaultMessage bar"
    });
  });

  it("should be able to extract messages with our macro under alias import", function() {
    expect(
      compile(resolve(__dirname, "fixture/messageAlias.ts"))
    ).to.deep.equal({
      "3nxZQB0eo3": {
        id: "3nxZQB0eo3",
        description: "description bar",
        defaultMessage: "defaultMessage bar"
      },
      jv83iiJolI: {
        id: "jv83iiJolI",
        description: "description foo",
        defaultMessage: "defaultMessage foo"
      }
    });
    const strings = require("./fixture/defineMessage.js");
    expect(strings.foo).to.deep.equal({
      id: "jv83iiJolI",
      defaultMessage: "defaultMessage foo"
    });
    expect(strings.bar).to.deep.equal({
      id: "3nxZQB0eo3",
      defaultMessage: "defaultMessage bar"
    });
  });
});
