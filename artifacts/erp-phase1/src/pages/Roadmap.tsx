import { roadmap } from "../data/roadmap";
import { CheckCircle, Clock, Target } from "lucide-react";

export default function Roadmap() {
  const totalWeeks = roadmap.reduce((acc, p) => acc + p.durationWeeks, 0);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold mb-1">خارطة الطريق</h1>
        <p className="text-muted-foreground text-sm">
          {roadmap.length} مراحل بإجمالي {totalWeeks} أسبوع حتى الإنتاج الكامل
        </p>
      </div>

      {/* Timeline bar */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">الجدول الزمني الكلي</div>
        <div className="flex rounded-lg overflow-hidden h-8 gap-0.5">
          {roadmap.map((phase) => (
            <div
              key={phase.phase}
              className={`${phase.color} flex items-center justify-center text-white text-xs font-bold transition-all hover:opacity-90`}
              style={{ flex: phase.durationWeeks }}
              title={`${phase.nameAr} — ${phase.durationWeeks} أسبوع`}
            >
              {phase.phase}
            </div>
          ))}
        </div>
        <div className="flex mt-2 gap-0.5">
          {roadmap.map((phase) => (
            <div
              key={phase.phase}
              className="text-xs text-muted-foreground text-center"
              style={{ flex: phase.durationWeeks }}
            >
              {phase.durationWeeks} أسبوع
            </div>
          ))}
        </div>
      </div>

      {/* Phase cards */}
      <div className="space-y-5">
        {roadmap.map((phase) => (
          <div
            key={phase.phase}
            className="rounded-xl border border-border bg-card overflow-hidden"
            data-testid={`phase-${phase.phase}`}
          >
            {/* Header */}
            <div className={`${phase.color} px-5 py-4 flex items-center gap-4`}>
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {phase.phase}
              </div>
              <div className="flex-1">
                <div className="font-bold text-white text-base">{phase.nameAr}</div>
                <div className="text-white/70 text-xs">{phase.nameEn}</div>
              </div>
              <div className="flex items-center gap-2 text-white/90 bg-white/10 px-3 py-1.5 rounded-lg text-sm">
                <Clock size={14} />
                <span>{phase.durationWeeks} أسبوع</span>
              </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x-reverse md:divide-x">
              {/* Deliverables */}
              <div className="p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">المخرجات</div>
                <div className="space-y-2">
                  {phase.deliverables.map((del, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">{del}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones */}
              <div className="p-5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">المعالم الرئيسية</div>
                <div className="space-y-2">
                  {phase.milestones.map((ms, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
                      <Target size={14} className="text-primary mt-0.5 shrink-0" />
                      <span className="text-sm font-medium">{ms}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">ملخص الجدول الزمني</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {roadmap.map((phase) => (
            <div key={phase.phase} className="text-center">
              <div className={`w-8 h-8 ${phase.color} rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm`}>
                {phase.phase}
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                {phase.durationWeeks} أسبوع
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-center">
          <span className="font-bold text-primary">الإجمالي: {totalWeeks} أسبوع</span>
          {" "}حتى إطلاق الإنتاج الكامل مع تكامل ZATCA والواجهة العربية
        </div>
      </div>
    </div>
  );
}
