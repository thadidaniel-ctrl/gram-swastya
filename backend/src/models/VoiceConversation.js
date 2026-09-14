const mongoose = require('mongoose');

const voiceConversationSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },

    sessionId: { type: String, required: true, index: true },

    language: { type: String, enum: ['en', 'hi', 'te', 'ta', 'mr'], default: 'en' },

    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        text: { type: String, required: true },
        audioUrl: String,
        timestamp: { type: Date, default: Date.now },

        // AI response metadata
        intent: String,
        entities: mongoose.Schema.Types.Mixed,
        actions: [mongoose.Schema.Types.Mixed],
        riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        confidence: Number,
        requiresHandoff: Boolean,
        handoffReason: String,

        // Cache info
        fromCache: { type: Boolean, default: false },
        patternMatched: String,
        cacheKey: String,
        processingTimeMs: Number,
      },
    ],

    // Session stats
    totalMessages: { type: Number, default: 0 },
    cacheHits: { type: Number, default: 0 },
    geminiCalls: { type: Number, default: 0 },

    startedAt: { type: Date, default: Date.now },
    endedAt: Date,

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

voiceConversationSchema.index({ patient: 1, startedAt: -1 });
voiceConversationSchema.index({ sessionId: 1 });

voiceConversationSchema.methods.addMessage = function (message) {
  this.messages.push(message);
  this.totalMessages += 1;
  if (message.fromCache) this.cacheHits += 1;
  else this.geminiCalls += 1;
  return this.save();
};

voiceConversationSchema.methods.endSession = function () {
  this.isActive = false;
  this.endedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('VoiceConversation', voiceConversationSchema);
