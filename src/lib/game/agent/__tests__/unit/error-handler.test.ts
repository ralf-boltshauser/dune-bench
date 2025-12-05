/**
 * Error Handler Module Unit Tests
 *
 * Tests for error-handler.ts module functions.
 */

import { describe, test } from "../helpers/utils/test-utils";
import {
  isSchemaSerializationError,
  handleAgentError,
  createPassResponse,
} from "../../provider/error-handler";
import { Faction } from "@/lib/game/types";
import {
  assertSchemaErrorDetected,
  assertPassResponseCreated,
} from "../helpers/assertions/module-assertions";
import {
  testErrorDetection,
  testErrorHandling,
  testPassResponseCreation,
} from "../helpers/module-test-utils";

describe("Error Handler Module", () => {
  describe("isSchemaSerializationError", () => {
    test("should detect schema serialization error", () => {
      const error = new Error("Transforms cannot be represented in JSON Schema");
      assertSchemaErrorDetected(error, true);
    });

    test("should not detect non-schema error", () => {
      const error = new Error("Network error");
      assertSchemaErrorDetected(error, false);
    });

    test("should handle non-Error objects", () => {
      assertSchemaErrorDetected("string error", false);
      assertSchemaErrorDetected(null, false);
      assertSchemaErrorDetected(undefined, false);
    });

    test("should detect error with schema pattern in message", () => {
      const error = new Error(
        "Some error: Transforms cannot be represented in JSON Schema - details"
      );
      assertSchemaErrorDetected(error, true);
    });
  });

  describe("handleAgentError", () => {
    test("should return pass response for non-schema error", () => {
      const error = new Error("Network error");
      const response = handleAgentError(error, Faction.ATREIDES);

      assertPassResponseCreated(response, Faction.ATREIDES, "Network error");
    });

    test("should throw for schema serialization error", () => {
      const error = new Error("Transforms cannot be represented in JSON Schema");
      let errorThrown = false;

      try {
        handleAgentError(error, Faction.ATREIDES);
      } catch (thrownError) {
        if (
          thrownError instanceof Error &&
          thrownError.name === "SchemaSerializationError"
        ) {
          errorThrown = true;
        } else {
          throw thrownError;
        }
      }

      if (!errorThrown) {
        throw new Error("Expected handleAgentError to throw for schema error");
      }
    });

    test("should return pass response with error message in reasoning", () => {
      const error = new Error("Custom error message");
      const response = handleAgentError(error, Faction.HARKONNEN);

      if (!response.reasoning?.includes("Custom error message")) {
        throw new Error(
          `Expected reasoning to include error message, got: ${response.reasoning}`
        );
      }
    });

    test("should handle unknown error type", () => {
      const error = "String error";
      const response = handleAgentError(error, Faction.ATREIDES);

      assertPassResponseCreated(response, Faction.ATREIDES, "Unknown error");
    });
  });

  describe("createPassResponse", () => {
    test("should create pass response with faction and reasoning", () => {
      const response = createPassResponse(Faction.ATREIDES, "Test reasoning");

      assertPassResponseCreated(response, Faction.ATREIDES);
      if (response.reasoning !== "Test reasoning") {
        throw new Error(
          `Expected reasoning to be "Test reasoning", got: ${response.reasoning}`
        );
      }
    });

    test("should create pass response with correct structure", () => {
      const response = createPassResponse(Faction.HARKONNEN, "Error occurred");

      if (response.factionId !== Faction.HARKONNEN) {
        throw new Error(
          `Expected factionId to be ${Faction.HARKONNEN}, got ${response.factionId}`
        );
      }
      if (response.actionType !== "PASS") {
        throw new Error(
          `Expected actionType to be PASS, got ${response.actionType}`
        );
      }
      if (!response.passed) {
        throw new Error("Expected passed to be true");
      }
      if (typeof response.data !== "object") {
        throw new Error("Expected data to be an object");
      }
    });

    test("should create pass response for all factions", () => {
      const factions = [
        Faction.ATREIDES,
        Faction.BENE_GESSERIT,
        Faction.EMPEROR,
        Faction.FREMEN,
        Faction.HARKONNEN,
        Faction.SPACING_GUILD,
      ];

      for (const faction of factions) {
        const response = createPassResponse(faction, "Test");
        assertPassResponseCreated(response, faction);
      }
    });
  });
});

