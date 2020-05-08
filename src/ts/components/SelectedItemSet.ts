export interface SelectableItem {
  selected: boolean;
}

export class SelectedItemSet<T extends SelectableItem> {

  private _selection: T[] = [];
  private _itemAboutToBeSelected: T = null;

  public onchange: Function = () => {};

  public getItems(): T[] { return this._selection; }

  public addToSelection(item: T, deselectAll: boolean = false): void {
    if (deselectAll) {
      this.deselectAll();
    }

    this._selection.push (item);
    item.selected = true;
  }

  public addToSelectionMouseDown(item: T, isShiftKeyDown: boolean): boolean {
    if (this._selection.includes(item)) {
      // The item is already selected
      if (isShiftKeyDown) {
        this.removeFromSelection (item);
        return true;
      }

      return false;

    } else {
      if (! isShiftKeyDown) {
        this.deselectAll();
      }

      this.doAddToSelection(item, true);
      return true;
    }
  }

  public addToSelectionMouseUp(wasMouseDragged: boolean, isShiftKeyDown: boolean, actionConsumedOnMouseDown: boolean): void {
    if (this._itemAboutToBeSelected == null
      || wasMouseDragged
      || actionConsumedOnMouseDown
      || this._selection.includes(this._itemAboutToBeSelected))
      return;

    if (! isShiftKeyDown) {
      this.deselectAll();
    }

    this.doAddToSelection(this._itemAboutToBeSelected, true);

    this._itemAboutToBeSelected = null;
  }

  public setUniqueSelection(item: T): void {
    this.deselectAll();
    this.doAddToSelection(item, true);
  }

  public removeFromSelection(item: T): void {
    this._selection = this._selection.filter((selected) => selected !== item);
    item.selected = false;
    this.onchange();
  }

  public deselectAll(): void {
    this._selection.forEach(item => item.selected = false);
    this._selection = [];
    this.onchange();
  }

  private doAddToSelection(item: T, notify: boolean): void {
    this._selection.push (item);
    item.selected = true;

    if (notify) {
      this.onchange();
    }
  }
}