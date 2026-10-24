import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import {
  ClassificationService,
  CLASSIFICATION_PROMPT_VERSION,
  CLASSIFICATION_SCHEMA_VERSION,
  DEFAULT_AI_MODEL,
} from "../services/classification.service.js";

describe("ClassificationService", () => {
  const service = new ClassificationService();
  const activeSlugs = new Set([
    "ai",
    "ml",
    "db",
    "backend",
    "apis",
    "system-design",
    "dsa",
    "web",
    "devops",
    "security",
    "languages",
    "cs",
    "tech-news",
    "tech-debates",
  ]);

  it("should have consistent prompt and schema version constants", () => {
    expect(CLASSIFICATION_PROMPT_VERSION).toBe("v1.0.0");
    expect(CLASSIFICATION_SCHEMA_VERSION).toBe("v1.0.0");
    expect(DEFAULT_AI_MODEL).toBe("gpt-6-luna");
  });

  it("should include topic definitions in the system prompt", () => {
    const prompt = service.getSystemPrompt();
    expect(prompt).toContain('Slug: "ai"');
    expect(prompt).toContain('Slug: "db"');
    expect(prompt).toContain('Slug: "backend"');
    expect(prompt).toContain("CLASSIFICATION RULES");
  });

  it("should build a valid batch request line with truncated description and structured output schema", () => {
    const video = {
      id: "vid-123",
      title: "Building Microservices with NestJS and PostgreSQL",
      description: "A comprehensive guide to backend architecture. ".repeat(50),
    };

    const requestLine = service.buildBatchRequestLine(video);

    expect(requestLine.custom_id).toBe("vid-123");
    expect(requestLine.method).toBe("POST");
    expect(requestLine.url).toBe("/v1/chat/completions");
    expect(requestLine.body.model).toBe("gpt-6-luna");
    expect(requestLine.body.messages.length).toBe(2);
    expect(requestLine.body.messages[0]?.role).toBe("system");
    expect(requestLine.body.messages[1]?.role).toBe("user");
    expect(requestLine.body.messages[1]?.content).toContain("Video Title:");
    expect(requestLine.body.response_format).toBeDefined();
  });

  describe("validateResponseContent", () => {
    it("should return an empty array when content is empty or contains an empty list", () => {
      expect(service.validateResponseContent("", activeSlugs)).toEqual([]);
      expect(
        service.validateResponseContent('{"topic_ids": []}', activeSlugs),
      ).toEqual([]);
    });

    it("should accept valid topic slugs (1 to 3 tags)", () => {
      const json = JSON.stringify({ topic_ids: ["ai", "backend"] });
      const result = service.validateResponseContent(json, activeSlugs);
      expect(result).toEqual(["ai", "backend"]);
    });

    it("should accept exactly 3 valid topic slugs", () => {
      const json = JSON.stringify({
        topic_ids: ["backend", "db", "system-design"],
      });
      const result = service.validateResponseContent(json, activeSlugs);
      expect(result).toEqual(["backend", "db", "system-design"]);
    });

    it("should deduplicate duplicate topic slugs", () => {
      const json = JSON.stringify({ topic_ids: ["ai", "ai", "ml"] });
      const result = service.validateResponseContent(json, activeSlugs);
      expect(result).toEqual(["ai", "ml"]);
    });

    it("should throw BadRequestException if JSON is malformed", () => {
      expect(() =>
        service.validateResponseContent("invalid json", activeSlugs),
      ).toThrow(BadRequestException);
    });

    it("should throw BadRequestException if topic_ids is missing or not an array", () => {
      expect(() =>
        service.validateResponseContent('{"topics": ["ai"]}', activeSlugs),
      ).toThrow(BadRequestException);
    });

    it("should throw BadRequestException if model returns more than 3 distinct topics", () => {
      const json = JSON.stringify({
        topic_ids: ["ai", "ml", "db", "backend"],
      });
      expect(() => service.validateResponseContent(json, activeSlugs)).toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException if model returns an unapproved topic slug", () => {
      const json = JSON.stringify({ topic_ids: ["quantum-computing"] });
      expect(() => service.validateResponseContent(json, activeSlugs)).toThrow(
        BadRequestException,
      );
    });
  });
});

