import { Injectable, Logger } from "@nestjs/common";
import OpenAI, { toFile } from "openai";

export interface IOpenAiBatchClient {
  uploadBatchInputFile(jsonlLines: string): Promise<string>;
  createBatch(
    inputFileId: string,
    metadata?: Record<string, string>,
  ): Promise<OpenAI.Batches.Batch>;
  retrieveBatch(batchId: string): Promise<OpenAI.Batches.Batch>;
  getBatchOutputFileContent(fileId: string): Promise<string>;
  cancelBatch(batchId: string): Promise<OpenAI.Batches.Batch>;
}

@Injectable()
export class OpenAiBatchClient implements IOpenAiBatchClient {
  private readonly logger = new Logger(OpenAiBatchClient.name);
  private readonly client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || "mock-openai-key";
    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }

  /**
   * Uploads a JSONL formatted string as a batch input file to OpenAI.
   */
  async uploadBatchInputFile(jsonlLines: string): Promise<string> {
    try {
      const file = await toFile(
        Buffer.from(jsonlLines, "utf-8"),
        "batch_input.jsonl",
        { type: "application/jsonl" },
      );

      const response = await this.client.files.create({
        file,
        purpose: "batch",
      });

      this.logger.log(`Uploaded batch input file. File ID: ${response.id}`);
      return response.id;
    } catch (err) {
      this.logger.error(
        `Failed to upload batch input file: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Creates an OpenAI batch for asynchronous processing with a 24-hour completion window.
   */
  async createBatch(
    inputFileId: string,
    metadata?: Record<string, string>,
  ): Promise<OpenAI.Batches.Batch> {
    try {
      const batch = await this.client.batches.create({
        input_file_id: inputFileId,
        endpoint: "/v1/chat/completions",
        completion_window: "24h",
        metadata,
      });

      this.logger.log(
        `Created OpenAI batch ${batch.id} with input file ${inputFileId}. Status: ${batch.status}`,
      );
      return batch;
    } catch (err) {
      this.logger.error(`Failed to create batch: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Retrieves the current status and metrics of a batch job.
   */
  async retrieveBatch(batchId: string): Promise<OpenAI.Batches.Batch> {
    try {
      return await this.client.batches.retrieve(batchId);
    } catch (err) {
      this.logger.error(
        `Failed to retrieve batch ${batchId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Downloads the text content of a completed output or error file from OpenAI.
   */
  async getBatchOutputFileContent(fileId: string): Promise<string> {
    try {
      const fileResponse = await this.client.files.content(fileId);
      return await fileResponse.text();
    } catch (err) {
      this.logger.error(
        `Failed to get batch file content for file ${fileId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  /**
   * Cancels an in-progress batch.
   */
  async cancelBatch(batchId: string): Promise<OpenAI.Batches.Batch> {
    try {
      return await this.client.batches.cancel(batchId);
    } catch (err) {
      this.logger.error(
        `Failed to cancel batch ${batchId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }
}

