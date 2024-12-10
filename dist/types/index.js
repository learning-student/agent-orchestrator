"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticipantRole = exports.AgentTypes = exports.ANTHROPIC_MODEL_ID_CLAUDE_3_5_SONNET = exports.OPENAI_MODEL_ID_GPT_O_MINI = exports.BEDROCK_MODEL_ID_LLAMA_3_70B = exports.BEDROCK_MODEL_ID_CLAUDE_3_5_SONNET = exports.BEDROCK_MODEL_ID_CLAUDE_3_SONNET = exports.BEDROCK_MODEL_ID_CLAUDE_3_HAIKU = void 0;
exports.BEDROCK_MODEL_ID_CLAUDE_3_HAIKU = "anthropic.claude-3-haiku-20240307-v1:0";
exports.BEDROCK_MODEL_ID_CLAUDE_3_SONNET = "anthropic.claude-3-sonnet-20240229-v1:0";
exports.BEDROCK_MODEL_ID_CLAUDE_3_5_SONNET = "anthropic.claude-3-5-sonnet-20240620-v1:0";
exports.BEDROCK_MODEL_ID_LLAMA_3_70B = "meta.llama3-70b-instruct-v1:0";
exports.OPENAI_MODEL_ID_GPT_O_MINI = "gpt-4o-mini";
exports.ANTHROPIC_MODEL_ID_CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20240620";
exports.AgentTypes = {
    DEFAULT: "Common Knowledge",
    CLASSIFIER: "classifier",
};
/**
 * Represents the possible roles in a conversation.
 */
var ParticipantRole;
(function (ParticipantRole) {
    ParticipantRole["ASSISTANT"] = "assistant";
    ParticipantRole["USER"] = "user";
    ParticipantRole["SYSTEM"] = "system";
})(ParticipantRole || (exports.ParticipantRole = ParticipantRole = {}));
//# sourceMappingURL=index.js.map