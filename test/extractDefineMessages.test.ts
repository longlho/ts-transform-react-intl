import compile from "../compile";
import { resolve } from "path";
import { expect } from "chai";

describe("extractDefineMessages", function() {
  this.timeout(5000);
  it("should be able to extract messages with our macro", function() {
    expect(
      compile(resolve(__dirname, "fixture/defineMessage.ts"))
    ).to.deep.equal({
      bar: {
        id: "3nxZQB0eo3",
        description: "description bar",
        defaultMessage: "defaultMessage bar"
      },
      foo: {
        id: "jv83iiJolI",
        description: "description foo",
        defaultMessage: "defaultMessage foo"
      }
    });

    expect(require("./fixture/defineMessage.js").strings).to.deep.equal({
      foo: {
        id: "jv83iiJolI",
        defaultMessage: "defaultMessage foo"
      },
      bar: {
        id: "3nxZQB0eo3",
        defaultMessage: "defaultMessage bar"
      }
    });
  });

  it("should be able to extract messages with our macro under alias import", function() {
    expect(
      compile(resolve(__dirname, "fixture/messageAlias.ts"))
    ).to.deep.equal({
      bar: {
        id: "3nxZQB0eo3",
        description: "description bar",
        defaultMessage: "defaultMessage bar"
      },
      foo: {
        id: "jv83iiJolI",
        description: "description foo",
        defaultMessage: "defaultMessage foo"
      }
    });

    expect(require("./fixture/messageAlias.js").strings).to.deep.equal({
      foo: {
        id: "jv83iiJolI",
        defaultMessage: "defaultMessage foo"
      },
      bar: {
        id: "3nxZQB0eo3",
        defaultMessage: "defaultMessage bar"
      }
    });
  });
});
