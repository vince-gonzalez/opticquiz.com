# winget manifests

For submitting OpticQuiz Corrector to the Windows Package Manager, so that

```
winget install OpticQuiz.Corrector
```

works on any Windows machine.

`winget validate` passes clean on these. The SHA256 was taken from the **published release
asset**, downloaded from GitHub — not from the local build — and then confirmed to match the
local `dist/` binary byte for byte. A manifest hash that does not match what the world
downloads is the one thing winget rejects outright.

## To submit

1. Fork **https://github.com/microsoft/winget-pkgs**
2. Copy this directory's `manifests/` tree into your fork, preserving the path exactly:
   `manifests/o/OpticQuiz/Corrector/1.1.0/`
3. Commit and open a pull request titled `New package: OpticQuiz.Corrector version 1.1.0`
4. Automated validation runs on the PR — it downloads the installer, checks the hash, and
   test-installs in a sandbox. Fix anything it flags; a human reviews after it goes green.

Or use the community tool, which does all of that for you:

```
winget install wingetcreate
wingetcreate submit --token <github-pat> winget\manifests\o\OpticQuiz\Corrector\1.1.0
```

## Updating for a new release

```
wingetcreate update OpticQuiz.Corrector --version 1.2.0 ^
  --urls https://github.com/zengineco/opticquiz.com/releases/download/<tag>/OpticQuizCorrector.exe ^
  --submit --token <github-pat>
```

It recomputes the hash from the live URL, which is the safe way — hand-editing the hash is
how a manifest ends up describing a binary nobody can actually download.

## Why `portable`

The app is a single self-contained executable with no installer and no registry footprint. It
runs from the tray. `InstallerType: portable` tells winget to place the binary and register the
`opticquizcorrector` command rather than look for an uninstall entry that does not exist.

## Known: the binary is unsigned

Windows will warn about an unrecognised publisher. That is disclosed on
https://opticquiz.com/setup/ alongside a link to the source. Signing is tracked separately —
SignPath Foundation offers free OV certificates to qualifying open-source projects, and Azure
Trusted Signing covers individual developers in the US and Canada.
