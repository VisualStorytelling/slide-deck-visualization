export const bla = 'bla';

import { ProvenanceNode, ProvenanceGraphTraverser } from '@visualstorytelling/provenance-core';

export type Annotation = any;

export type ProvenanceSlide = {
  node?: ProvenanceNode;
  name: string;
  duration: number;
  delay: number;
  annotations?: Annotation[];
};

export class ProvenanceBasedSlidedeck {
  private _slides: ProvenanceSlide[] = [];
  private traverser: ProvenanceGraphTraverser;

  public get slides() {
    return this._slides;
  }

  constructor(traverser: ProvenanceGraphTraverser) {
    this.traverser = traverser;
    // this.graph = traverser.graph;
  }

  public addSlide(slide: ProvenanceSlide, index?: number) {
    if (!index || isNaN(index) || !Number.isInteger(index) || index > this._slides.length || index < 0) {
      index = this._slides.length;
    }
    this._slides.splice(index, 0, slide);
  }

  public removeSlideAtIndex(index: number) {
    this._slides.splice(index, 1);
  }

  public removeSlide(slide: ProvenanceSlide) {
    this.removeSlideAtIndex(this._slides.indexOf(slide));
  }

  public moveSlide(indexFrom: number, indexTo: number, count: number = 1) {
    const movedSlides = this._slides.splice(indexFrom, count);
    const newPosition = indexTo > indexFrom ? indexTo - count : indexTo;
    this._slides.splice(newPosition, 0, ...movedSlides);
  }

}
