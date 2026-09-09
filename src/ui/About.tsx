/**
 * What this extension is: its version, where it comes from, and what it does with what it can see.
 * The version is read from the manifest rather than written here, so it cannot drift out of step
 * with what is actually installed.
 */
import { useMessages } from './messages.tsx';

// Namespace resolution only, the same as in storage.ts
declare const chrome: typeof browser | undefined;
const api: typeof browser = typeof browser !== 'undefined' ? browser : chrome!;

const REPOSITORY = 'https://github.com/yuzneri/X-Tweaks';
const ISSUES = `${REPOSITORY}/issues`;
const PRIVACY = `${REPOSITORY}/blob/main/PRIVACY.md`;
const LICENSE = 'Apache License 2.0';

/** Opens in a tab of its own. The settings screen is also the in-page panel, and leaving it would close it */
const Link = ({ href, text }: { href: string; text: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {text}
  </a>
);

export const About = () => {
  const m = useMessages();
  const version = api.runtime.getManifest().version;

  return (
    <>
      <dl class="about">
        <dt>{m.meta.version}</dt>
        <dd>{version}</dd>

        <dt>{m.meta.source}</dt>
        <dd>
          <Link href={REPOSITORY} text={REPOSITORY.replace('https://', '')} />
        </dd>

        <dt>{m.meta.issues}</dt>
        <dd>
          <Link href={ISSUES} text={m.meta.issuesLink} />
        </dd>

        <dt>{m.meta.license}</dt>
        <dd>{LICENSE}</dd>
      </dl>

      <fieldset>
        <legend>{m.meta.privacy}</legend>
        {/* The answer first, the document after. It is the question asked most often */}
        <p class="hint">{m.meta.privacyNote}</p>
        <p>
          <Link href={PRIVACY} text={m.meta.policy} />
        </p>
      </fieldset>
    </>
  );
};
