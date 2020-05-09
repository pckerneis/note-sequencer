export interface CustomColor {
  name: string,
  cssName: string,
  defaultValue: string,
  value: string,
}

export abstract class CustomElement extends HTMLElement {
  protected readonly customColors: CustomColor[] = [];

  public static getCssName(propertyName: string): string {
    return '--' + propertyName.split(/(?=[A-Z])/).join('-').toLowerCase();
  }

  protected registerCustomColor(name: string, defaultValue: string) : void {
    const cssName = CustomElement.getCssName(name);
    const state = {name, cssName, defaultValue, value: defaultValue};
    this.customColors.push(state);
  }

  protected styleChanged(): void {
    const computedStyle = window.getComputedStyle(this, null);

    this.customColors.forEach((colorState) => {
      colorState.value = computedStyle.getPropertyValue(colorState.cssName) || colorState.value;
    })
  }

}