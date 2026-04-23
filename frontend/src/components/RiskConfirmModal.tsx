import { RiskAssessment } from '../../../shared/types';
import { AlertTriangle, X, Check } from 'lucide-react';

interface RiskConfirmModalProps {
  assessment: RiskAssessment;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RiskConfirmModal: React.FC<RiskConfirmModalProps> = ({
  assessment,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 theme-transition"
         style={{ backgroundColor: 'var(--color-overlay)' }}>
      <div className="rounded-lg max-w-md w-full mx-4 shadow-2xl theme-transition"
           style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-danger)' }}>
        {/* 头部 */}
        <div className="flex items-center gap-3 px-6 py-4 border-b theme-transition"
             style={{ borderColor: 'var(--color-border)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center theme-transition"
               style={{ backgroundColor: 'var(--color-danger-dim)' }}>
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold theme-transition" style={{ color: 'var(--color-text-primary)' }}>
              检测到高风险操作
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
              该操作可能影响系统稳定性
            </p>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-3">
          <div>
            <p className="text-sm mb-1 theme-transition" style={{ color: 'var(--color-text-secondary)' }}>将要执行的命令：</p>
            <code className="block rounded px-3 py-2 font-mono text-sm theme-transition"
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-danger)' }}>
              {assessment.command}
            </code>
          </div>

          <div>
            <p className="text-sm mb-1 theme-transition" style={{ color: 'var(--color-text-secondary)' }}>风险说明：</p>
            <p className="text-sm" style={{ color: 'var(--color-warning)' }}>{assessment.reason}</p>
          </div>

          <div className="rounded-lg p-3 theme-transition"
               style={{ backgroundColor: 'var(--color-danger-dim)', border: '1px solid var(--color-danger)' }}>
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
              ⚠️ 请确认您了解此操作的影响。建议先备份重要数据。
            </p>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 px-6 py-4 border-t theme-transition"
             style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors theme-transition"
            style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-primary)' }}
          >
            <X className="w-4 h-4" />
            取消操作
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors theme-transition"
            style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
          >
            <Check className="w-4 h-4" />
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
};
