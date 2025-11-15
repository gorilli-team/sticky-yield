import mongoose from "mongoose";

// APY History Schema
const apyHistorySchema = new mongoose.Schema(
  {
    pool_address: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    chain: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
    },
    url: {
      type: String,
    },
    input_token: {
      type: String,
      lowercase: true,
      index: true,
    },
    // APY data
    total_apy: {
      type: Number,
      required: true,
      default: 0,
    },
    historic_apy: {
      type: Number,
      default: 0,
    },
    rewards_apy: {
      type: Number,
      default: 0,
    },
    // Raw GlueX response for debugging
    raw_response: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Metadata
    success: {
      type: Boolean,
      default: true,
    },
    error_message: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Compound indexes for efficient queries
apyHistorySchema.index({ pool_address: 1, timestamp: -1 });
apyHistorySchema.index({ input_token: 1, timestamp: -1 });
apyHistorySchema.index({ chain: 1, timestamp: -1 });
apyHistorySchema.index({ timestamp: -1 });

// Model
export const ApyHistory = mongoose.model("ApyHistory", apyHistorySchema);

// Types
export interface IApyHistory {
  pool_address: string;
  chain: string;
  description?: string;
  url?: string;
  input_token?: string;
  total_apy: number;
  historic_apy: number;
  rewards_apy: number;
  raw_response?: any;
  success: boolean;
  error_message?: string;
  timestamp: Date;
}
