import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, ArrowLeft, ClipboardCheck, AlertOctagon, ShieldX,
} from 'lucide-react';
import { auditAPI } from '../../services/auditApi';
import { processAPI } from '../../services/processApi';
import AuditCorrectivePlan from './AuditCorrectivePlan';

export default function AuditCorrectivePlanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const a = await auditAPI.get(id);
      setAudit(a);
      const st = await processAPI.listStaff().catch(() => []);
      setStaffList(st || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />Cargando plan correctivo…
      </div>
    );
  }
  if (!audit) {
    return <div className="text-slate-500">Auditoría no encontrada</div>;
  }

  const eligible =
    audit.estado === 'completada' && audit.aprobada === false;

  return (
    <div className="animate-fade-in max-w-5xl" data-testid="audit-corrective-plan-page">
      <button
        onClick={() => navigate(`/audits/${id}`)}
        data-testid="back-to-audit-btn"
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />Volver a la auditoría
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-slate-400">{audit.codigo}</p>
            <h1 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              Plan de acción correctiva
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Auditoría: <span className="font-medium text-slate-700">{audit.proceso_nombre}</span>
              {' · '}Evaluador <span className="font-medium text-slate-700">{audit.evaluador_nombre}</span>
              {' · '}Evaluado <span className="font-medium text-slate-700">{audit.evaluado_nombre || '—'}</span>
              {' · '}{audit.fecha}
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Cumplimiento: <strong>{audit.porcentaje}%</strong>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full ${
                  (audit.criticos_omitidos || 0) > 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Críticos omitidos: <strong>{audit.criticos_omitidos || 0}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold uppercase inline-flex items-center gap-1">
                <ShieldX className="w-3 h-3" />Reprobada
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate(`/audits/${id}`)}
            className="text-xs bg-white border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-1 text-slate-600"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />Ver evaluación
          </button>
        </div>
      </div>

      {!eligible ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
          {audit.estado !== 'completada' ? (
            <>
              El plan de acción correctiva solo se puede registrar después de finalizar la auditoría.{' '}
              <button
                onClick={() => navigate(`/audits/${id}`)}
                className="underline font-semibold"
              >
                Volver a la evaluación
              </button>
              .
            </>
          ) : (
            <>Esta auditoría fue aprobada — no requiere plan correctivo.</>
          )}
        </div>
      ) : (
        <AuditCorrectivePlan
          audit={audit}
          staffList={staffList}
          readOnly={false}
          onSaved={(updated) => setAudit(prev => ({ ...prev, plan_correctivo: updated }))}
        />
      )}
    </div>
  );
}
