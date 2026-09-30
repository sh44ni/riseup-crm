import React from 'react';
import type { ContractFormState } from './contractTypes';
import { labelCls, inputCls } from './contractTypes';

interface Props {
  form: ContractFormState;
  onChange: (patch: Partial<ContractFormState>) => void;
}

export function ContractStep1ProjectInfo({ form, onChange }: Props) {
  const updateForm = (key: keyof ContractFormState, val: string) => onChange({ [key]: val });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Client Name</label>
          <input
            type="text"
            value={form.clientName}
            onChange={(e) => updateForm('clientName', e.target.value)}
            className={inputCls}
            placeholder="Full legal name of homeowner"
          />
        </div>
        <div>
          <label className={labelCls}>Project Address</label>
          <input
            type="text"
            value={form.projectAddress}
            onChange={(e) => updateForm('projectAddress', e.target.value)}
            className={inputCls}
            placeholder="Street, City, State, ZIP"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Contract Date</label>
          <input
            type="text"
            value={form.contractDate}
            onChange={(e) => updateForm('contractDate', e.target.value)}
            className={inputCls}
            placeholder="e.g. September 24, 2026"
          />
        </div>
        <div>
          <label className={labelCls}>Cancellation Deadline</label>
          <input
            type="text"
            value={form.cancellationDeadline}
            onChange={(e) => updateForm('cancellationDeadline', e.target.value)}
            className={inputCls}
            placeholder="3-day right to cancel deadline"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Commencement / Start Date</label>
          <input
            type="text"
            value={form.commencementDate}
            onChange={(e) => {
              onChange({ commencementDate: e.target.value, startDate: e.target.value });
            }}
            className={inputCls}
            placeholder="Approximate start date"
          />
        </div>
        <div>
          <label className={labelCls}>Target Completion Date</label>
          <input
            type="text"
            value={form.completionDate}
            onChange={(e) => updateForm('completionDate', e.target.value)}
            className={inputCls}
            placeholder="Approximate completion date"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Salesperson Name</label>
          <input
            type="text"
            value={form.salespersonName}
            onChange={(e) => updateForm('salespersonName', e.target.value)}
            className={inputCls}
            placeholder="Rep who closed the deal"
          />
        </div>
        <div>
          <label className={labelCls}>Contractor / Company Name</label>
          <input
            type="text"
            value={form.contractorName}
            onChange={(e) => updateForm('contractorName', e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Contractor Title</label>
          <input
            type="text"
            value={form.contractorTitle}
            onChange={(e) => updateForm('contractorTitle', e.target.value)}
            className={inputCls}
            placeholder="e.g. Authorized Representative"
          />
        </div>
        <div>
          <label className={labelCls}>License Number</label>
          <input
            type="text"
            value={form.licenseNumber}
            onChange={(e) => updateForm('licenseNumber', e.target.value)}
            className={inputCls}
            placeholder="CSLB #"
          />
        </div>
      </div>
    </div>
  );
}
