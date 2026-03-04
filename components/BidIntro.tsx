import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';

interface Props {
  lang: Language;
  onContinue: () => void;
}

const BidIntro: React.FC<Props> = ({ lang, onContinue }) => {
  const isCN = lang === 'CN';
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleScroll = () => {
      const threshold = 50;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
        setHasScrolledToBottom(true);
      }
    };
    // If content doesn't overflow, allow immediately
    if (el.scrollHeight <= el.clientHeight + 50) {
      setHasScrolledToBottom(true);
    }
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-tsinghua-50/30 flex items-center justify-center px-4 py-8">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-tsinghua-500 to-tsinghua-700 text-white font-black text-2xl shadow-lg shadow-tsinghua-200/50 mb-4">
            BM
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">
            {isCN ? '商业模式工坊 BID' : 'Business Model Workshop BID'}
          </h1>
          <p className="text-sm text-gray-400 font-medium">
            {isCN ? '清华经管商业模式创新研究中心' : 'Tsinghua SEM Business Model Innovation Center'}
          </p>
        </div>

        {/* Scrollable Content Area */}
        <div
          ref={contentRef}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-y-auto px-8 py-8 space-y-8"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
        >
          {isCN ? (
            <>
              {/* Section 1: Core Philosophy */}
              <section>
                <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-tsinghua-100 text-tsinghua-700 flex items-center justify-center text-sm font-black">01</span>
                  这个时代的底层逻辑
                </h2>
                <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                  <p>世界正在经历一场底层逻辑的重写。大多数教育告诉你怎么做，<strong className="text-gray-900">BID 告诉你世界为什么这样运转——以及它将往哪里去。</strong></p>
                  <p>这个时代最大的红利，从来属于认知领先的人。每天追着新工具跑，本质上是在追随别人的判断。真正的领先，不在于用了多少工具，而在于你有没有一套属于自己的认知框架——一个能让你在任何变化面前，都知道该往哪里走的心智模型。</p>
                  <div className="bg-tsinghua-50/50 border border-tsinghua-100 rounded-2xl p-4">
                    <p className="text-tsinghua-800 font-bold text-sm">BID 是唯一一个从思维设计出发应对 AI 时代的项目。我们不培养工具使用者，不培养创业者——我们培养的是能够看懂结构、预判方向、提前布局的人。</p>
                  </div>
                </div>
              </section>

              {/* Section 2: AI Era Insight */}
              <section>
                <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-black">02</span>
                  AI 时代真正的护城河
                </h2>
                <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                  <p>前百度总裁陆奇说得很直接：<em className="text-gray-900 font-semibold">"在 AI 时代，唯一稀缺的竞争力是你有多大的独特见解。"</em></p>
                  <p>当 AI 能在 30 秒生成商业分析报告，当执行门槛趋近于零——传统创业教育引以为傲的那些技能，正在快速贬值。真正值钱的不再是"你能做什么"，而是"你看到了什么别人看不到的东西"。</p>
                  <p>你需要回答的核心问题：做什么、为什么重要、为什么是现在、为什么是你、壁垒是什么。</p>
                </div>
              </section>

              {/* Section 3: About BID */}
              <section>
                <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black">03</span>
                  关于 BID
                </h2>
                <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                  <p>商业智慧设计人才培养计划（Business Intelligence Design，简称 BID）由清华经管学院金融系教授、博士生导师、清华经管商业模式创新研究中心主任<strong className="text-gray-900">朱武祥</strong>创办。</p>
                  <p>每期持续一学期：<strong className="text-gray-900">8 次周末课程 + 2 次小组探讨研究</strong>，系统讲授商业模式、经济、金融、前沿科技等领域的理论知识与最新趋势。自 2016 年至今已举办十七期，培养学员超过 700 人。</p>
                  <p>参与者中 <strong className="text-gray-900">80% 来自非经管专业，25% 为博士同学</strong>——我们尤为欢迎多元化背景的你。</p>
                </div>
              </section>

              {/* Section 4: What You'll Gain */}
              <section>
                <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-black">04</span>
                  在 BID，你将收获
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: '📚', title: '系统学习', desc: '商业、经济、金融领域专家授课，快速建立商业世界整体认知' },
                    { icon: '🔍', title: '案例实战', desc: '真实案例拆解和跨背景小组讨论，训练商业分析与思维能力' },
                    { icon: '🚀', title: '前沿视野', desc: '深入 AI、互联网、金融创新等前沿话题，形成属于自己的行业洞察' },
                    { icon: '🤝', title: '优质社群与发展机会', desc: '跨学科讨论场域，展现优秀能力后获得实习、研究资源与职业支持' },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="font-bold text-gray-900 text-sm mb-1">{item.icon} {item.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 5: Who Should Join */}
              <section>
                <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">05</span>
                  加入我们，如果你
                </h2>
                <ul className="space-y-2 text-sm text-gray-600">
                  {[
                    '相信 AI 正在重塑一切，想要站在浪潮之巅',
                    '不想做"AI 工具的附庸"，而想做"指挥 AI 的创造者"',
                    '有想要验证的想法，缺的是方法论和同行者',
                    '想快速建立商业认知，打开跨学科视野',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-tsinghua-600 mt-0.5 flex-shrink-0">✓</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="text-center pt-2 pb-1">
                <p className="text-xs text-gray-400 italic">"当获取信息的边际成本趋近于零，真正稀缺的是你看到了什么别人看不到的东西。"</p>
              </div>
            </>
          ) : (
            <>
              {/* EN Version */}
              <section>
                <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-tsinghua-100 text-tsinghua-700 flex items-center justify-center text-sm font-black">01</span>
                  The Underlying Logic of This Era
                </h2>
                <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                  <p>The world is undergoing a fundamental rewrite of its underlying logic. Most education tells you how to do things. <strong className="text-gray-900">BID tells you why the world works this way—and where it's heading.</strong></p>
                  <p>The biggest dividend of this era belongs to those with cognitive leadership. Chasing new tools every day means following someone else's judgment. True leadership isn't about how many tools you use, but whether you have your own cognitive framework.</p>
                  <div className="bg-tsinghua-50/50 border border-tsinghua-100 rounded-2xl p-4">
                    <p className="text-tsinghua-800 font-bold text-sm">BID is the only program that approaches the AI era from the perspective of thinking design. We don't train tool users or entrepreneurs—we cultivate people who can read structures, predict directions, and plan ahead.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-black">02</span>
                  The Real Moat in the AI Era
                </h2>
                <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                  <p>Former Baidu President Lu Qi put it directly: <em className="text-gray-900 font-semibold">"In the AI era, the only scarce competitive advantage is the depth of your unique insights."</em></p>
                  <p>When AI can generate business analysis in 30 seconds, what truly matters is no longer "what you can do" but "what you can see that others can't."</p>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black">03</span>
                  About BID
                </h2>
                <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                  <p>Business Intelligence Design (BID) was founded by <strong className="text-gray-900">Professor Zhu Wuxiang</strong>, doctoral supervisor at Tsinghua SEM's Finance Department and Director of the Business Model Innovation Center.</p>
                  <p>Each cohort lasts one semester: <strong className="text-gray-900">8 weekend lectures + 2 group research sessions</strong>. Since 2016, BID has run 17 cohorts with 700+ alumni. <strong className="text-gray-900">80% come from non-business backgrounds, 25% are PhD students.</strong></p>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-black">04</span>
                  What You'll Gain
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: '📚', title: 'Systematic Learning', desc: 'Expert-led courses in business, economics, and finance' },
                    { icon: '🔍', title: 'Case Practice', desc: 'Real case analysis with cross-disciplinary team discussions' },
                    { icon: '🚀', title: 'Frontier Insights', desc: 'Deep dive into AI, internet, and financial innovation trends' },
                    { icon: '🤝', title: 'Network & Opportunities', desc: 'Cross-disciplinary community with internship and career support' },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="font-bold text-gray-900 text-sm mb-1">{item.icon} {item.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="text-center pt-2 pb-1">
                <p className="text-xs text-gray-400 italic">"When the marginal cost of information approaches zero, the only scarcity is what you can see that others cannot."</p>
              </div>
            </>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="mt-5 flex flex-col items-center gap-2">
          {!hasScrolledToBottom && (
            <p className="text-xs text-gray-400 animate-pulse">
              {isCN ? '请滑动阅读全部内容' : 'Please scroll to read all content'}
            </p>
          )}
          <button
            onClick={onContinue}
            disabled={!hasScrolledToBottom}
            className={`w-full max-w-md py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-lg ${
              hasScrolledToBottom
                ? 'bg-gray-900 text-white hover:bg-black active:scale-[0.98] cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isCN ? '我已阅读，开始填写申请' : 'I have read this, proceed to application'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BidIntro;
