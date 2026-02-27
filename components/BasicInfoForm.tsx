
import React, { useState } from 'react';
import { CandidateBasicInfo, Language } from '../types';
import { translations } from '../i18n';

interface Props {
  onSubmit: (info: CandidateBasicInfo) => void;
  lang: Language;
}

const BasicInfoForm: React.FC<Props> = ({ onSubmit, lang }) => {
  const t = translations[lang];
  const identityKeys: CandidateBasicInfo['identity'][] = ['Undergraduate', 'Master', 'MBA', 'PhD', 'Employee'];

  const [formData, setFormData] = useState<CandidateBasicInfo>({
    name: '',
    wechat: '',
    identity: 'Undergraduate',
    schoolOrUnit: '',
    major: '',
    gradeOrLevel: '',
    yearOrExperience: '',
    timeCommitmentWeeks1to8: 0,
    timeCommitmentWeeks9to16: 0,
    offlineInterview: false,
    phone: '',
    email: '',
    projects: '',
    homeworkWillingness: false,
    leaderWillingness: false,
    selfDescription: '',
  });

  const [validationError, setValidationError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    const val = type === 'checkbox' ? (e.target as any).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    setValidationError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.wechat || !formData.schoolOrUnit || !formData.phone || !formData.selfDescription) {
      setValidationError(true);
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="flex justify-center py-10 px-4">
      <div className="bg-white p-12 rounded-3xl shadow-2xl w-full max-w-2xl border-t-8 border-tsinghua-500 relative animate-scale-in">
        <h2 className="text-3xl font-black text-gray-900 mb-8 border-b pb-4 tracking-tight">
          {t.basicInfoTitle}
        </h2>

        {validationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-semibold text-center">
            {t.formValidationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name + WeChat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.name} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder={t.namePlaceholder}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.wechat} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="wechat"
                placeholder="WeChat ID"
                value={formData.wechat}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
                required
              />
            </div>
          </div>

          {/* Self Description */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-2">
              {t.selfDesc} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="selfDescription"
              placeholder={t.selfDescPlaceholder}
              value={formData.selfDescription}
              onChange={handleChange}
              className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
              required
            />
          </div>

          {/* Identity + School */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.identity}
              </label>
              <select
                name="identity"
                value={formData.identity}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-black"
              >
                {identityKeys.map((key) => (
                  <option key={key} value={key}>
                    {t.identityOptions[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.schoolUnit} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="schoolOrUnit"
                placeholder={t.schoolPlaceholder}
                value={formData.schoolOrUnit}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
                required
              />
            </div>
          </div>

          {/* Major + Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.major}
              </label>
              <input
                type="text"
                name="major"
                placeholder={t.majorPlaceholder}
                value={formData.major}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.gradeLevel}
              </label>
              <input
                type="text"
                name="gradeOrLevel"
                placeholder={t.gradePlaceholder}
                value={formData.gradeOrLevel}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
              />
            </div>
          </div>

          {/* Year/Exp + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.yearOrExp}
              </label>
              <input
                type="text"
                name="yearOrExperience"
                placeholder={t.yearPlaceholder}
                value={formData.yearOrExperience}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.phone} <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                placeholder={t.phonePlaceholder}
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-2">
              {t.email}
            </label>
            <input
              type="email"
              name="email"
              placeholder={t.emailPlaceholder}
              value={formData.email}
              onChange={handleChange}
              className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
            />
          </div>

          {/* Time Commitment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-tsinghua-50/50 p-8 rounded-3xl border border-tsinghua-100">
            <div className="col-span-1 md:col-span-2">
              <h4 className="text-xs font-black text-tsinghua-600 uppercase tracking-widest mb-1">
                {t.weeklyCommitTitle}
              </h4>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                {t.weekPhase1}
              </label>
              <input
                type="number"
                name="timeCommitmentWeeks1to8"
                value={formData.timeCommitmentWeeks1to8 || ''}
                onChange={handleChange}
                min={0}
                placeholder={lang === 'CN' ? '例如 10' : 'e.g. 10'}
                className="w-full px-5 py-2.5 border border-tsinghua-100 rounded-xl outline-none focus:ring-4 focus:ring-tsinghua-200 font-black text-tsinghua-700 placeholder:text-gray-300 placeholder:font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                {t.weekPhase2}
              </label>
              <input
                type="number"
                name="timeCommitmentWeeks9to16"
                value={formData.timeCommitmentWeeks9to16 || ''}
                onChange={handleChange}
                min={0}
                placeholder={lang === 'CN' ? '例如 10' : 'e.g. 10'}
                className="w-full px-5 py-2.5 border border-tsinghua-100 rounded-xl outline-none focus:ring-4 focus:ring-tsinghua-200 font-black text-tsinghua-700 placeholder:text-gray-300 placeholder:font-medium"
              />
            </div>
          </div>

          {/* Projects */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                {t.projects} ({t.projectsLimit})
              </label>
              <span
                className={`text-[10px] font-bold ${
                  formData.projects.length > 150 ? 'text-red-500' : 'text-gray-300'
                }`}
              >
                {formData.projects.length} / 150
              </span>
            </div>
            <textarea
              name="projects"
              value={formData.projects}
              onChange={handleChange}
              rows={4}
              maxLength={150}
              placeholder={t.projectsPlaceholder}
              className="w-full px-5 py-4 border border-gray-100 rounded-3xl resize-none focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col gap-4 py-4 px-2">
            <label className="flex items-center gap-4 cursor-pointer group">
              <input
                type="checkbox"
                name="offlineInterview"
                checked={formData.offlineInterview}
                onChange={handleChange}
                className="w-6 h-6 rounded-lg border-gray-300 text-tsinghua-600 focus:ring-tsinghua-500"
              />
              <span className="text-sm font-bold text-gray-700 group-hover:text-tsinghua-600 transition">
                {t.offlineInterview}
              </span>
            </label>
            <label className="flex items-center gap-4 cursor-pointer group">
              <input
                type="checkbox"
                name="homeworkWillingness"
                checked={formData.homeworkWillingness}
                onChange={handleChange}
                className="w-6 h-6 rounded-lg border-gray-300 text-tsinghua-600 focus:ring-tsinghua-500"
              />
              <span className="text-sm font-bold text-gray-700 group-hover:text-tsinghua-600 transition">
                {t.willingness} ({t.willingnessNote})
              </span>
            </label>
            <label className="flex items-center gap-4 cursor-pointer group">
              <input
                type="checkbox"
                name="leaderWillingness"
                checked={formData.leaderWillingness}
                onChange={handleChange}
                className="w-6 h-6 rounded-lg border-gray-300 text-tsinghua-600 focus:ring-tsinghua-500"
              />
              <span className="text-sm font-bold text-gray-700 group-hover:text-tsinghua-600 transition">
                {t.leader}
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-6 bg-gray-900 text-white font-black rounded-3xl hover:bg-black transition-all shadow-2xl active:scale-[0.98] tracking-widest uppercase text-sm"
          >
            {t.submit}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BasicInfoForm;
