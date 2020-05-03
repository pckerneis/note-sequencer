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
    let itemAboutToBeSelected = item;

    let itemIsSelected = false;

    for (let s of this._selection) {
      if (s == itemAboutToBeSelected) {
        itemIsSelected = true;
        break;
      }
    }

    if (! itemIsSelected) {
      if (! isShiftKeyDown) {
        this.deselectAll();
      }

      this._selection.push (itemAboutToBeSelected);
      itemAboutToBeSelected.selected = true;
      this.onchange();

      return true;
    }

    // The item is already selected
    if (isShiftKeyDown) {
      this.removeFromSelection (itemAboutToBeSelected);

      return true;
    }

    return false;
  }

  public addToSelectionMouseUp(wasMouseDragged: boolean, isShiftKeyDown: boolean, actionConsumedOnMouseDown: boolean): void {
    if (this._itemAboutToBeSelected == null) {
      return;
    }

    let itemIsSelected = false;

    for (let s of this._selection) {
      if (s === this._itemAboutToBeSelected) {
        itemIsSelected = true;
        break;
      }
    }

    if (wasMouseDragged || actionConsumedOnMouseDown)
      return;

    if (! isShiftKeyDown) {
      this.deselectAll();
    }

    this._selection.push (this._itemAboutToBeSelected);
    this._itemAboutToBeSelected.selected = true;
    this.onchange();

    this._itemAboutToBeSelected = null;
  }

  public setUniqueSelection(item: T): void {
    this.deselectAll();
    this._selection.push(item);
    item.selected = true;
  }

  // TODO: good be better
  public removeFromSelection(item: T): void {
    for (let i = this._selection.length; --i >= 0;) {
      if (this._selection[i] === item) {
        item.selected = false;
        this._selection.splice (i, 1);
        this.onchange();
        break;
      }
    }
  }

  public deselectAll(): void {
    for (let s of this._selection)
      s.selected = false;

    this._selection = [];
    this.onchange();
  }
}