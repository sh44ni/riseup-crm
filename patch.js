const fs = require('fs');

function applyPatch(file, patches) {
  let content = fs.readFileSync(file, 'utf8');
  for (let i = 0; i < patches.length; i++) {
    const p = patches[i];
    if (content.includes(p.search)) {
      content = content.replace(p.search, p.replace);
      console.log(`Patched ${file} chunk ${i}`);
    } else {
      console.error(`FAILED TO PATCH ${file} chunk ${i}`);
    }
  }
  fs.writeFileSync(file, content);
}

// 1. CreateJobModal.tsx
applyPatch('a:/Riseup Roofing Main Dir/crm/src/components/jobs/CreateJobModal.tsx', [
  {
    search: `import { CreateJobPayload } from '@/api/jobsApi';`,
    replace: `import { CreateJobPayload } from '@/api/jobsApi';
import { z } from 'zod';

const CreateJobSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().optional().or(z.literal('')),
  serviceType: z.string().min(1, 'Service type is required'),
  contractValue: z.number().nonnegative().optional(),
});`
  },
  {
    search: `  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;`,
    replace: `  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;`
  },
  {
    search: `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    setIsSubmitting(true);`,
    replace: `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const formData = {
      customerName,
      address,
      phone: customerPhone,
      serviceType,
      contractValue: Number(contractValue)
    };
    const result = CreateJobSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(result.error.format())) {
        if (key !== '_errors' && Array.isArray((issues as any)._errors)) {
          fieldErrors[key] = (issues as any)._errors[0];
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setIsSubmitting(true);`
  },
  {
    search: `            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Full Customer Name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
              />`,
    replace: `            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Full Customer Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
                />
                {errors.customerName && <p className="text-rose-500 text-xs mt-1">{errors.customerName}</p>}
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
                />
                {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>}
              </div>`
  },
  {
    search: `              <div className="sm:col-span-12">
                <input
                  type="text"
                  placeholder="Street Address (e.g. 4520 Highland Dr)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
                />
              </div>`,
    replace: `              <div className="sm:col-span-12">
                <input
                  type="text"
                  placeholder="Street Address (e.g. 4520 Highland Dr)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none transition-all"
                />
                {errors.address && <p className="text-rose-500 text-xs mt-1">{errors.address}</p>}
              </div>`
  },
  {
    search: `              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Scope of Work</label>
                <input
                  type="text"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none mt-1 transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Contract Value ($)</label>
                <input
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none mt-1 transition-all"
                />
              </div>`,
    replace: `              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Scope of Work</label>
                <input
                  type="text"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none mt-1 transition-all"
                />
                {errors.serviceType && <p className="text-rose-500 text-xs mt-1">{errors.serviceType}</p>}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Contract Value ($)</label>
                <input
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 font-semibold text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-[#0284C7] dark:focus:border-sky-500 focus:outline-none mt-1 transition-all"
                />
                {errors.contractValue && <p className="text-rose-500 text-xs mt-1">{errors.contractValue}</p>}
              </div>`
  }
]);

// 2. CreateLeadModal.tsx
applyPatch('a:/Riseup Roofing Main Dir/crm/src/components/pipeline/CreateLeadModal.tsx', [
  {
    search: `import { cleanseAuthor, serializeProfileNote } from '@/lib/noteUtils';`,
    replace: `import { cleanseAuthor, serializeProfileNote } from '@/lib/noteUtils';
import { z } from 'zod';

const CreateLeadSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  serviceType: z.string().min(1, 'Service type is required'),
});`
  },
  {
    search: `  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);`,
    replace: `  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});`
  },
  {
    search: `    if (!formData.name.trim()) {
      setError('Please enter the homeowner / company full name.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.replace(/\\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setSubmitting(true);
    setError(null);`,
    replace: `    const validationData = {
      fullName: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      serviceType: formData.service
    };
    const result = CreateLeadSchema.safeParse(validationData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(result.error.format())) {
        if (key !== '_errors' && Array.isArray((issues as any)._errors)) {
          fieldErrors[key] = (issues as any)._errors[0];
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!formData.name.trim()) {
      setError('Please enter the homeowner / company full name.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.replace(/\\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setSubmitting(true);
    setError(null);`
  },
  {
    search: `                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(760) 000-0000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>`,
    replace: `                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(760) 000-0000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
                {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>}
              </div>`
  },
  {
    search: `                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>`,
    replace: `                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
                {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email}</p>}
              </div>`
  },
  {
    search: `                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Robert Johnson"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
            </div>`,
    replace: `                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Robert Johnson"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-white/5 dark:hover:bg-white/10 dark:focus:bg-slate-900 border border-slate-200/90 dark:border-white/12 focus:border-[#1878B8] dark:focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
                  />
                </div>
                {errors.fullName && <p className="text-rose-500 text-xs mt-1">{errors.fullName}</p>}
            </div>`
  }
]);

// 3. CreateClientModal.tsx
applyPatch('a:/Riseup Roofing Main Dir/crm/src/components/clients/CreateClientModal.tsx', [
  {
    search: `import { CreateClientPayload, checkClientContact } from '@/api/clientsApi';`,
    replace: `import { CreateClientPayload, checkClientContact } from '@/api/clientsApi';
import { z } from 'zod';

const CreateClientSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
});`
  },
  {
    search: `  const [isCheckingPhone, setIsCheckingPhone] = useState(false);`,
    replace: `  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});`
  },
  {
    search: `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {`,
    replace: `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = CreateClientSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(result.error.format())) {
        if (key !== '_errors' && Array.isArray((issues as any)._errors)) {
          fieldErrors[key] = (issues as any)._errors[0];
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!formData.fullName.trim()) {`
  },
  {
    search: `              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Robert Vance"
                className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>
          </div>`,
    replace: `              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Robert Vance"
                className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0284C7] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>
            {errors.fullName && <p className="text-rose-500 text-xs mt-1">{errors.fullName}</p>}
          </div>`
  },
  {
    search: `                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                  <span>{phoneConflict}</span>
                </div>
              )}
            </div>`,
    replace: `                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                  <span>{phoneConflict}</span>
                </div>
              )}
              {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>}
            </div>`
  },
  {
    search: `                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                  <span>{emailConflict}</span>
                </div>
              )}
            </div>`,
    replace: `                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                  <span>{emailConflict}</span>
                </div>
              )}
              {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email}</p>}
            </div>`
  }
]);

// 4. CreateExistingClientModal.tsx
applyPatch('a:/Riseup Roofing Main Dir/crm/src/components/clients/CreateExistingClientModal.tsx', [
  {
    search: `import { CreateExistingClientPayload, checkClientContact } from '@/api/clientsApi';`,
    replace: `import { CreateExistingClientPayload, checkClientContact } from '@/api/clientsApi';
import { z } from 'zod';

const CreateClientSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
});`
  },
  {
    search: `  const [isCheckingPhone, setIsCheckingPhone] = useState(false);`,
    replace: `  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});`
  },
  {
    search: `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {`,
    replace: `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      fullName,
      phone,
      email,
    };
    const result = CreateClientSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(result.error.format())) {
        if (key !== '_errors' && Array.isArray((issues as any)._errors)) {
          fieldErrors[key] = (issues as any)._errors[0];
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!fullName.trim() || fullName.trim().length < 2) {`
  },
  {
    search: `                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Robert Henderson"
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>`,
    replace: `                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Robert Henderson"
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
                {errors.fullName && <p className="text-rose-500 text-xs mt-1">{errors.fullName}</p>}
              </div>`
  },
  {
    search: `                  <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-start gap-1.5 leading-tight animate-in fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                    <span>{phoneConflict}</span>
                  </div>
                )}
              </div>`,
    replace: `                  <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-start gap-1.5 leading-tight animate-in fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                    <span>{phoneConflict}</span>
                  </div>
                )}
                {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>}
              </div>`
  },
  {
    search: `                  <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-start gap-1.5 leading-tight animate-in fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                    <span>{emailConflict}</span>
                  </div>
                )}
              </div>`,
    replace: `                  <div className="mt-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-start gap-1.5 leading-tight animate-in fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                    <span>{emailConflict}</span>
                  </div>
                )}
                {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email}</p>}
              </div>`
  }
]);

// 5. ScheduleOperationModal.tsx
applyPatch('a:/Riseup Roofing Main Dir/crm/src/components/calendar/ScheduleOperationModal.tsx', [
  {
    search: `import { fetchRealJobs, fetchPipelineJobs } from '@/api/calendarApi';`,
    replace: `import { fetchRealJobs, fetchPipelineJobs } from '@/api/calendarApi';
import { z } from 'zod';

const ScheduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  scheduledDate: z.string().min(1, 'Date is required'),
  assignedTo: z.string().optional(),
});`
  },
  {
    search: `  const [availableJobs, setAvailableJobs] = useState<any[]>([]);`,
    replace: `  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});`
  },
  {
    search: `  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;`,
    replace: `  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      title,
      scheduledDate: dateStr,
      assignedTo: String(assignedUserId),
    };
    const result = ScheduleSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(result.error.format())) {
        if (key !== '_errors' && Array.isArray((issues as any)._errors)) {
          fieldErrors[key] = (issues as any)._errors[0];
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!title.trim()) return;`
  },
  {
    search: `            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Initial Roof Inspection & Consultation"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
            />
          </div>`,
    replace: `            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Initial Roof Inspection & Consultation"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
            />
            {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title}</p>}
          </div>`
  },
  {
    search: `              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>`,
    replace: `              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-sky-500 shadow-2xs"
              />
              {errors.scheduledDate && <p className="text-rose-500 text-xs mt-1">{errors.scheduledDate}</p>}
            </div>`
  }
]);

// 6. ProfileSettingsModal.tsx
applyPatch('a:/Riseup Roofing Main Dir/crm/src/components/profile/ProfileSettingsModal.tsx', [
  {
    search: `import { useTheme } from '@/context/ThemeContext';
import { api, API_ORIGIN } from '@/lib/api';`,
    replace: `import { useTheme } from '@/context/ThemeContext';
import { api, API_ORIGIN } from '@/lib/api';
import { z } from 'zod';

const ProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
});`
  },
  {
    search: `  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);`,
    replace: `  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});`
  },
  {
    search: `  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {`,
    replace: `  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      name,
      email: displayEmail,
    };
    const result = ProfileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(result.error.format())) {
        if (key !== '_errors' && Array.isArray((issues as any)._errors)) {
          fieldErrors[key] = (issues as any)._errors[0];
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    if (!name.trim()) {`
  },
  {
    search: `                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sam Martinez"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs transition-all placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <User size={14} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                </div>
              </div>`,
    replace: `                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sam Martinez"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/20 font-bold text-slate-900 dark:text-white outline-none shadow-2xs transition-all placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <User size={14} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                </div>
                {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
              </div>`
  }
]);

console.log("Done");
