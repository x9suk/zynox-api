const mongoose = require('mongoose');

const ownerAuditLogSchema = new mongoose.Schema({
  ownerDiscordId: {
    type: String,
    required: true,
    index: true,
  },
  command: {
    type: String,
    required: true,
  },
  args: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  action: {
    type: String,
    default: null,
  },
  targetDiscordId: {
    type: String,
    default: null,
    index: true,
  },
  success: {
    type: Boolean,
    default: true,
  },
  reason: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

ownerAuditLogSchema.index({ createdAt: -1 });
ownerAuditLogSchema.index({ ownerDiscordId: 1, createdAt: -1 });

ownerAuditLogSchema.statics.log = function (data) {
  return this.create({
    ownerDiscordId: data.ownerDiscordId,
    command: data.command,
    args: data.args || null,
    action: data.action || null,
    targetDiscordId: data.targetDiscordId || null,
    success: data.success !== false,
    reason: data.reason || null,
  });
};

module.exports = mongoose.model('OwnerAuditLog', ownerAuditLogSchema);
