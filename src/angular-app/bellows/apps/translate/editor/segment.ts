import { RangeStatic } from 'quill';

export class Segment {
  private _text: string;
  private _range: RangeStatic;
  private initialText: string;

  constructor(public readonly documentSetId: string, public readonly ref: string) { }

  get text(): string {
    return this._text;
  }

  get range(): RangeStatic {
    return this._range;
  }

  get isChanged(): boolean {
    return this._text !== this.initialText;
  }

  acceptChanges(): void {
    this.initialText = this._text;
  }

  update(text: string, range: RangeStatic): void {
    this._text = text;
    this._range = range;
    if (this.initialText == null) {
      this.initialText = text;
    }
  }

  get productiveCharacterCount(): number {
    return this.text.length - this.initialText.length;
  }

}
