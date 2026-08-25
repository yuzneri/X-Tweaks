/**
 * twitter-text の適合性テスト（conformance/extract.yml, v3.1.0）をそのまま流す。
 * https://github.com/twitter/twitter-text
 *
 * X がハッシュタグをどう読むかの正本であり、hashtags.ts はこの表に合わせて書かれている。
 * 表は生成物なので手で編集しない。更新するときは上流の yml から作り直す。
 *
 * 期待値は「#」を除いた本体。実装は打たれたままの文字列を返すので、比較時に落とす。
 * 上流は同じタグの重複を落とさないが、実装は落とすので、期待値側も落としてある。
 * 目で判別できない文字（結合文字・異体字セレクタ・ゼロ幅文字・全角空白）はエスケープしてある。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashtagsIn } from './hashtags.ts';

/** 入力と、そこから取れるべきタグ（「#」抜き） */
const CASES: [string, string[]][] = [
  // Extract hashtag after emoji without variant selector (uFE0E or uFE0F)
  ['a ✌#hashtag here', ['hashtag']],
  // Extract hashtag after emoji with variant selector FE0E
  ['a ✌\ufe0e#hashtag here', ['hashtag']],
  // Extract hashtag after emoji with variant selector FE0F
  ['a ✌\ufe0f#hashtag here', ['hashtag']],
  // Extract hashtag after emoji with skin tone without variant selector (FE0E or FE0F)
  ['a ✌🏿#hashtag here', ['hashtag']],
  // Extract hashtag after emoji with skin tone with variant selector FE0F
  ['a ✌🏿\ufe0f#hashtag here', ['hashtag']],
  // Extract hashtag after emoji with zero-width-joiner
  ['a 👨\u200d👩\u200d👧#hashtag here', ['hashtag']],
  // Extract an all-alpha hashtag
  ['a #hashtag here', ['hashtag']],
  // Extract a letter-then-number hashtag
  ['this is #hashtag1', ['hashtag1']],
  // Extract a number-then-letter hashtag
  ['#1hashtag is this', ['1hashtag']],
  // DO NOT Extract an all-numeric hashtag
  ['On the #16 bus', []],
  // DO NOT Extract a single numeric hashtag
  ['#0', []],
  // Extract hashtag after bracket
  ['(#hashtag1 )#hashtag2 [#hashtag3 ]#hashtag4 ’#hashtag5’#hashtag6', ['hashtag1', 'hashtag2', 'hashtag3', 'hashtag4', 'hashtag5', 'hashtag6']],
  // Extract a hashtag containing ñ
  ['I\'ll write more tests #mañana', ['mañana']],
  // Extract a hashtag containing é
  ['Working remotely #café', ['café']],
  // Extract a hashtag containing ü
  ['Getting my Oktoberfest on #münchen', ['münchen']],
  // DO NOT Extract a hashtag containing Japanese
  ['this is not valid: # 会議中 ハッシュ', []],
  // Extract a hashtag in Korean
  ['What is #트위터 anyway?', ['트위터']],
  // Extract a half-width Hangul hashtag
  ['Just random half-width Hangul #ﾣﾦﾰ', ['ﾣﾦﾰ']],
  // Extract a hashtag in Russian
  ['What is #ашок anyway?', ['ашок']],
  // Extract a starting katakana hashtag
  ['#カタカナ is a hashtag', ['カタカナ']],
  // Extract a starting hiragana hashtag
  ['#ひらがな FTW!', ['ひらがな']],
  // Extract a starting kanji hashtag
  ['#漢字 is the future', ['漢字']],
  // Extract a trailing katakana hashtag
  ['Hashtag #カタカナ', ['カタカナ']],
  // Extract a trailing hiragana hashtag
  ['Japanese hashtags #ひらがな', ['ひらがな']],
  // Extract a trailing kanji hashtag
  ['Study time #漢字', ['漢字']],
  // Extract a central katakana hashtag
  ['See my #カタカナ hashtag?', ['カタカナ']],
  // Extract a central hiragana hashtag
  ['Study #ひらがな for fun and profit', ['ひらがな']],
  // Extract a central kanji hashtag
  ['Some say #漢字 is the past. what do they know?', ['漢字']],
  // Extract a Kanji/Katakana mixed hashtag
  ['日本語ハッシュタグテスト #日本語ハッシュタグ', ['日本語ハッシュタグ']],
  // Extract a hashtag after a punctuation
  ['日本語ハッシュテスト。#日本語ハッシュタグ', ['日本語ハッシュタグ']],
  // DO NOT include a punctuation in a hashtag
  ['#日本語ハッシュタグ。', ['日本語ハッシュタグ']],
  // Extract a full-width Alnum hashtag
  ['全角英数字ハッシュタグ ＃ｈａｓｈｔａｇ１２３', ['ｈａｓｈｔａｇ１２３']],
  // DO NOT extract a hashtag without a preceding space
  ['日本語ハッシュタグ#日本語ハッシュタグ', []],
  // Hashtag with chouon
  ['長音ハッシュタグ。#サッカー', ['サッカー']],
  // Hashtag with half-width chouon
  ['長音ハッシュタグ。#ｻｯｶｰ', ['ｻｯｶｰ']],
  // Hashtag with half-widh voiced sounds marks
  ['#ﾊｯｼｭﾀｸﾞ #ﾊﾟﾋﾟﾌﾟﾍﾟﾎﾟ', ['ﾊｯｼｭﾀｸﾞ', 'ﾊﾟﾋﾟﾌﾟﾍﾟﾎﾟ']],
  // Hashtag with half-width # after full-width ！
  ['できましたよー！#日本語ハッシュタグ。', ['日本語ハッシュタグ']],
  // Hashtag with full-width ＃ after full-width ！
  ['できましたよー！＃日本語ハッシュタグ。', ['日本語ハッシュタグ']],
  // Hashtag with ideographic iteration mark
  ['#云々 #学問のすゝめ #いすゞ #各〻 #各〃', ['云々', '学問のすゝめ', 'いすゞ', '各〻', '各〃']],
  // Extract hashtag with fullwidth tilde
  ['#メ～テレ ハッシュタグ内で～が認識されず', ['メ～テレ']],
  // Extract hashtag with wave dash
  ['#メ〜テレ ハッシュタグ内で～が認識されず', ['メ〜テレ']],
  // Hashtags with ş (U+015F)
  ['Here’s a test tweet for you: #Ateş #qrşt #ştu #ş', ['Ateş', 'qrşt', 'ştu', 'ş']],
  // Hashtags with İ (U+0130) and ı (U+0131)
  ['Here’s a test tweet for you: #İn #ın', ['İn', 'ın']],
  // Hashtag before punctuations
  ['#hashtag: #hashtag; #hashtag, #hashtag. #hashtag! #hashtag?', ['hashtag']],
  // Hashtag after punctuations
  [':#hashtag ;#hashtag ,#hashtag .#hashtag !#hashtag ?#hashtag', ['hashtag']],
  // Hashtag before newline
  ['#hashtag\ntest\n#hashtag2\ntest\n#hashtag3\n', ['hashtag', 'hashtag2', 'hashtag3']],
  // DO NOT extract hashtag when # is followed by URL
  ['#http://twitter.com #https://twitter.com', []],
  // DO NOT extract hashtag if it's a part of URL
  ['http://twitter.com/#hashtag twitter.com/#hashtag', []],
  // Extract hashtags with Latin extended characters
  ['#Azərbaycanca #mûǁae #Čeština #Ċaoiṁín', ['Azərbaycanca', 'mûǁae', 'Čeština', 'Ċaoiṁín']],
  // Extract Arabic hashtags
  ['#سیاست #ایران #السياسة #السياح #لغات  #اتمی  #کنفرانس #العربية #الجزيرة #فارسی', ['سیاست', 'ایران', 'السياسة', 'السياح', 'لغات', 'اتمی', 'کنفرانس', 'العربية', 'الجزيرة', 'فارسی']],
  // Extract Arabic hashtags with underscore
  ['#برنامه_نویسی  #رییس_جمهور  #رئيس_الوزراء, #ثبت_نام. #لس_آنجلس', ['برنامه_نویسی', 'رییس_جمهور', 'رئيس_الوزراء', 'ثبت_نام', 'لس_آنجلس']],
  // Extract Hebrew hashtags
  ['#עַל־יְדֵי #וכו׳ #מ״כ', ['עַל־יְדֵי', 'וכו׳', 'מ״כ']],
  // Extract Thai hashtags
  ['#ผู้เริ่ม #การเมือง #รายละเอียด #นักท่องเที่ยว #ของขวัญ #สนามบิน #เดินทาง #ประธาน', ['ผู้เริ่ม', 'การเมือง', 'รายละเอียด', 'นักท่องเที่ยว', 'ของขวัญ', 'สนามบิน', 'เดินทาง', 'ประธาน']],
  // Extract Arabic hashtags with Zero-Width Non-Joiner
  ['#أي\u200cبي\u200cإم #می\u200cخواهم', ['أي\u200cبي\u200cإم', 'می\u200cخواهم']],
  // Extract Amharic hashtag
  ['የአላህ መልእክተኛ ሰለላሁ ዓለይሂ ወሰለም #ኢትዮሙስሊምስ', ['ኢትዮሙስሊምስ']],
  // Extract Sinhala hashtag with Zero-Width Joiner (U+200D)
  ['#ශ්\u200dරීලංකා', ['ශ්\u200dරීලංකා']],
  // Extract Arabic and Persian hashtags with numbers
  ['#۳۴۵هشتگ #هشتگ۶۷۸ #ســـلام_عليكم_٤٠٦', ['۳۴۵هشتگ', 'هشتگ۶۷۸', 'ســـلام_عليكم_٤٠٦']],
  // Extract Hindi hashtags
  ['#महात्मा #महात्मा_१२३४ #१२३४ गांधी', ['महात्मा', 'महात्मा_१२३४']],
  // Extract Indic script hashtags
  ['#বাংলা #ગુજરાતી #ಕನ್ನಡ #മലയാളം #ଓଡ଼ିଆ #ਪੰਜਾਬੀ #සිංහල #தமிழ் #తెలుగు', ['বাংলা', 'ગુજરાતી', 'ಕನ್ನಡ', 'മലയാളം', 'ଓଡ଼ିଆ', 'ਪੰਜਾਬੀ', 'සිංහල', 'தமிழ்', 'తెలుగు']],
  // Extract Tibetan hashtags
  ['#བོད་སྐད་ #བོད་སྐད', ['བོད་སྐད་', 'བོད་སྐད']],
  // Extract Khmer, Burmese, Laotian hashtags
  ['#មហាត្មះគន្ធី #မြင့်မြတ်သော #ຊີວະສາດ', ['មហាត្មះគន្ធី', 'မြင့်မြတ်သော', 'ຊີວະສາດ']],
  // Extract Greek hashtag
  ['#Μαχάτμα_Γκάντι ήταν Ινδός πολιτικός', ['Μαχάτμα_Γκάντι']],
  // Extract Armenian and Georgian hashtags
  ['#Մահաթմա #მაჰათმა', ['Մահաթմա', 'მაჰათმა']],
  // Extract hashtag with middle dot
  ['#il·lusió', ['il·lusió']],
  // DO NOT extract hashtags without a letter
  ['#_ #1_2 #122 #〃', []],
  // Extract hashtag with letter from astral plane (U+20021)
  ['#𠀡', ['𠀡']],
  // Extract hashtag with letter plus marker from astral plane (U+16f04 U+16f51)
  ['#𖼄𖽑', ['𖼄𖽑']],
  // Extract hashtag with letter plus number from astral plane (U+104a0)
  ['#A𐒠', ['A𐒠']],
  // Extract a hastag at the start
  ['#hashtag here', ['hashtag']],
  // Extract a hastag at the end
  ['test a #hashtag', ['hashtag']],
  // Extract a hastag in the middle
  ['test a #hashtag in a string', ['hashtag']],
  // Extract only a valid hashtag
  ['#123 a #hashtag in a string', ['hashtag']],
  // Extract a hashtag in a string of multi-byte characters
  ['会議中 #hashtag 会議中', ['hashtag']],
  // Extract multiple valid hashtags
  ['One #two three #four', ['two', 'four']],
  // Extract a non-latin hashtag
  ['Hashtags in #русский!', ['русский']],
  // Extract multiple non-latin hashtags
  ['Hashtags in #中文, #日本語, #한국말, and #русский! Try it out!', ['中文', '日本語', '한국말', 'русский']],
];

test('twitter-text の適合性テストをすべて満たす', () => {
  for (const [text, expected] of CASES) {
    const actual = hashtagsIn(text).map((tag) => tag.replace(/^[#＃]/u, ''));
    assert.deepEqual(actual, expected, `入力: ${JSON.stringify(text)}`);
  }
});
