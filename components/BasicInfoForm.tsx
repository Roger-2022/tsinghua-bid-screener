
import React, { useState, useRef } from 'react';
import { CandidateBasicInfo, Language } from '../types';
import { translations } from '../i18n';
import { uploadResume } from '../services/resumeService';

interface Props {
  onSubmit: (info: CandidateBasicInfo) => void;
  lang: Language;
  initialData?: CandidateBasicInfo;
}

const GRADE_KEYS = [
  'freshman', 'sophomore', 'junior', 'senior',
  'master1', 'master2', 'master3',
  'mba1', 'mba2',
  'phd1', 'phd2', 'phd3', 'phd4', 'phd5',
] as const;

const REFERRAL_KEYS = [
  'wechatPost', 'friendRefer', 'teacherRefer', 'schoolForum', 'socialMedia', 'searchEngine', 'other',
] as const;

// Derive identity from grade selection
const gradeToIdentity = (grade: string): CandidateBasicInfo['identity'] => {
  if (['freshman', 'sophomore', 'junior', 'senior'].includes(grade)) return 'Undergraduate';
  if (['master1', 'master2', 'master3'].includes(grade)) return 'Master';
  if (['mba1', 'mba2'].includes(grade)) return 'MBA';
  if (['phd1', 'phd2', 'phd3', 'phd4', 'phd5'].includes(grade)) return 'PhD';
  return 'Undergraduate';
};

const BasicInfoForm: React.FC<Props> = ({ onSubmit, lang, initialData }) => {
  const t = translations[lang];

  const [formData, setFormData] = useState<CandidateBasicInfo>(initialData || {
    name: '',
    gender: 'male',
    wechat: '',
    identity: 'Undergraduate',
    school: '',
    department: '',
    major: '',
    gradeOrLevel: '',
    timeCommitmentWeeks1to8: 0,
    timeCommitmentWeeks9to16: 0,
    offlineInterview: false,
    phone: '',
    email: '',
    projects: '',
    homeworkWillingness: false,
    leaderWillingness: false,
    selfDescription: '',
    hasReadRecruitPost: '',
    careerPlan: '',
    referralSource: '',
  });

  const [validationError, setValidationError] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      alert(lang === 'CN' ? '请上传 PDF 或 Word 文件' : 'Please upload a PDF or Word file');
      return;
    }
    setResumeFile(file);
    setResumeUploading(true);
    const result = await uploadResume(file, formData.name || 'unnamed');
    setResumeUploading(false);
    if (result) {
      setFormData(prev => ({ ...prev, resumeUrl: result.url, resumeFileName: result.fileName }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    const val = type === 'checkbox' ? (e.target as any).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    setValidationError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name || !formData.wechat || !formData.school || !formData.department ||
      !formData.phone || !formData.selfDescription ||
      !formData.major || !formData.gradeOrLevel || !formData.email || !formData.projects ||
      !formData.hasReadRecruitPost || !formData.careerPlan || !formData.referralSource ||
      formData.timeCommitmentWeeks1to8 <= 0 || formData.timeCommitmentWeeks9to16 <= 0
    ) {
      setValidationError(true);
      return;
    }
    onSubmit({ ...formData, identity: gradeToIdentity(formData.gradeOrLevel) });
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
          {/* Name + Gender + WeChat */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.name} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder={(t as any).namePlaceholder}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {(t as any).gender} <span className="text-red-400">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-black"
                required
              >
                <option value="male">{(t as any).genderOptions?.male}</option>
                <option value="female">{(t as any).genderOptions?.female}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.wechat} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="wechat"
                placeholder={(t as any).wechatPlaceholder || 'WeChat ID'}
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
              placeholder={(t as any).selfDescPlaceholder}
              value={formData.selfDescription}
              onChange={handleChange}
              className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
              required
            />
          </div>

          {/* School + Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {(t as any).school} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="school"
                placeholder={(t as any).schoolPlaceholder}
                value={formData.school}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {(t as any).department} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="department"
                placeholder={(t as any).departmentPlaceholder}
                value={formData.department}
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
                {t.major} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="major"
                placeholder={(t as any).majorPlaceholder}
                value={formData.major}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {(t as any).gradeLevel} <span className="text-red-400">*</span>
              </label>
              <select
                name="gradeOrLevel"
                value={formData.gradeOrLevel}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-black"
                required
              >
                <option value="">{lang === 'CN' ? '请选择年级' : 'Select grade'}</option>
                {GRADE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {((t as any).gradeOptions as any)[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.phone} <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                placeholder={(t as any).phonePlaceholder}
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                {t.email} <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder={(t as any).emailPlaceholder}
                value={formData.email}
                onChange={handleChange}
                className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
                required
              />
            </div>
          </div>

          {/* Has Read Recruit Post */}
          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
            <div className="mb-3">
              <label className="text-xs font-black text-blue-600 uppercase tracking-widest">
                {(t as any).hasReadRecruitPost} <span className="text-red-400">*</span>
              </label>
            </div>
            <select
              name="hasReadRecruitPost"
              value={formData.hasReadRecruitPost}
              onChange={handleChange}
              className={`w-full px-5 py-3 border border-blue-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none bg-white ${formData.hasReadRecruitPost ? 'font-black' : 'text-gray-400'}`}
            >
              <option value="" disabled>{lang === 'CN' ? '请选择' : 'Please select'}</option>
              <option value="yes">{(t as any).readPostYes}</option>
              <option value="familiar_no_need">{(t as any).readPostNo}</option>
            </select>
          </div>

          {/* Career Plan */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                {(t as any).careerPlan} <span className="text-red-400">*</span>
              </label>
              <span
                className={`text-[10px] font-bold ${
                  formData.careerPlan.length > 150 ? 'text-red-500' : 'text-gray-300'
                }`}
              >
                {formData.careerPlan.length} / 150
              </span>
            </div>
            <textarea
              name="careerPlan"
              value={formData.careerPlan}
              onChange={handleChange}
              rows={3}
              maxLength={150}
              placeholder={(t as any).careerPlanPlaceholder}
              className="w-full px-5 py-4 border border-gray-100 rounded-3xl resize-none focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
              required
            />
          </div>

          {/* Referral Source */}
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-2">
              {(t as any).referralSource} <span className="text-red-400">*</span>
            </label>
            <select
              name="referralSource"
              value={formData.referralSource}
              onChange={handleChange}
              className="w-full px-5 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-black"
              required
            >
              <option value="">{lang === 'CN' ? '请选择' : 'Select'}</option>
              {REFERRAL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {((t as any).referralOptions as any)[key]}
                </option>
              ))}
            </select>
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
                {t.weekPhase1} <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                name="timeCommitmentWeeks1to8"
                value={formData.timeCommitmentWeeks1to8 || ''}
                onChange={handleChange}
                min={1}
                placeholder={lang === 'CN' ? '例如 10' : 'e.g. 10'}
                className="w-full px-5 py-2.5 border border-tsinghua-100 rounded-xl outline-none focus:ring-4 focus:ring-tsinghua-200 font-black text-tsinghua-700 placeholder:text-gray-300 placeholder:font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
                {t.weekPhase2} <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                name="timeCommitmentWeeks9to16"
                value={formData.timeCommitmentWeeks9to16 || ''}
                onChange={handleChange}
                min={1}
                placeholder={lang === 'CN' ? '例如 10' : 'e.g. 10'}
                className="w-full px-5 py-2.5 border border-tsinghua-100 rounded-xl outline-none focus:ring-4 focus:ring-tsinghua-200 font-black text-tsinghua-700 placeholder:text-gray-300 placeholder:font-medium"
                required
              />
            </div>
          </div>

          {/* Projects */}
          <div>
            <div className="mb-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                {(t as any).projectsLabel || '过往经历亮点'} <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 leading-relaxed">
                {(t as any).projectsPrompt || '请分享你最自豪的经历、有亮点的项目、你认为自己有特点的地方——为什么你觉得这个事情有亮点？你做了什么差异化的改变？（不限字数）'}
              </p>
            </div>
            <textarea
              name="projects"
              value={formData.projects}
              onChange={handleChange}
              rows={5}
              placeholder={(t as any).projectsPlaceholderNew || '例如：我在某次比赛中主导了方案设计，通过重新定义用户需求实现了差异化...'}
              className="w-full px-5 py-4 border border-gray-100 rounded-3xl resize-none focus:ring-4 focus:ring-tsinghua-100 outline-none bg-gray-50/50 font-medium"
              required
            />
          </div>


          {/* Resume Upload */}
          <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              {lang === 'CN' ? '上传简历（可选）' : 'Upload Resume (Optional)'}
            </label>
            <p className="text-xs text-gray-500 mb-3">
              {lang === 'CN' ? '支持 PDF 或 Word 文件，方便我们更全面地了解你' : 'PDF or Word files accepted'}
            </p>
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeChange}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => resumeInputRef.current?.click()}
                disabled={resumeUploading}
                className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:border-tsinghua-300 hover:text-tsinghua-600 transition disabled:opacity-50"
              >
                {resumeUploading ? (lang === 'CN' ? '上传中...' : 'Uploading...') : (lang === 'CN' ? '选择文件' : 'Choose File')}
              </button>
              {formData.resumeFileName && (
                <span className="text-sm text-tsinghua-600 font-medium">{formData.resumeFileName}</span>
              )}
            </div>
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
