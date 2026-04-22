
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-red-700 rounded-lg max-w-md w-full mx-4 shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700">
          <div className="w-10 h-10 bg-red-900/50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              检测到高风险操作
            </h3>
            <p className="text-sm text-red-400">
              该操作可能影响系统稳定性
            </p>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-3">
          <div>
            <p className="text-sm text-slate-400 mb-1">将要执行的命令：</p>
            <code className="block bg-black/30 rounded px-3 py-2 text-red-300 font-mono text-sm">
              {assessment.command}
            </code>
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-1">风险说明：</p>
            <p className="text-sm text-yellow-200">{assessment.reason}</p>
          </div>

          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-300">
              ⚠️ 请确认您了解此操作的影响。建议先备份重要数据。
            </p>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-700">
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
            取消操作
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Check className="w-4 h-4" />
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
};
