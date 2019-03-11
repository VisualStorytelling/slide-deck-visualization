import * as d3 from "d3";

import "./style.css";

import {
  IProvenanceSlide,
  ProvenanceSlide,
  IProvenanceSlidedeck
} from "@visualstorytelling/provenance-core";

function firstArgThis(f: (...args: any[]) => any) {
  return function(this: any, ...args: any[]) {
    return f(this, ...args);
  };
}

type IndexedSlide = { slide: IProvenanceSlide; startTime: number };

export class SlideDeckVisualization {
  private _slideDeck: IProvenanceSlidedeck;
  private _root: d3.Selection<HTMLDivElement, any, null, undefined>;
  private _slideTable: d3.Selection<SVGElement, any, null, undefined>;
  private _tableHeight = 125;
  private _tableWidth = 1800;
  private _minimumSlideDuration = 1000;
  private _barWidthTimeMultiplier = 0.05;
  private _barPadding = 5;
  private _resizebarwidth = 5;
  private _previousSlideX = 0;
  private _lineX1 = 50;
  private _placeholderWidth = 60;
  private _placeholderX = 0;
  private _placeholderHeight = 60;
  private _toolbarX = 10;
  private _toolbarY = 35;
  private _toolbarPadding = 20;
  // Upon dragging a slide, no matter where you click on it, the beginning of the slide jumps to the mouse position.
  // This next variable is calculated to adjust for that error, it is a workaround but it works
  private _draggedSlideReAdjustmentFactor = 0;

  private _originPosition = 60;
  private _currentTime = 0;
  private _currentlyPlaying = false;
  private _timelineShift = 0;
  private _timeIndexedSlides: IndexedSlide[] = [];
  private _gridTimeStep = 1000;
  private _gridSnap = false;

  private onDelete = (slide: IProvenanceSlide) => {
    this._slideDeck.removeSlide(slide);
  }

  private onSelect = (slide: IProvenanceSlide) => {
    if (d3.event.defaultPrevented) return;
    if (this._currentlyPlaying) {
      this.stopPlaying();
    }
    this.selectSlide(slide);
  }

  private selectSlide = (slide: IProvenanceSlide | null) => {
    if (slide === null) {
      return;
    }
    let originalSlideTransitionTime = slide.transitionTime;
    let artificialTransitionTime = 0;

    if (this._currentlyPlaying) {
      artificialTransitionTime =
        slide.transitionTime -
        (this._currentTime - this._slideDeck.startTime(slide));
    } else {
      artificialTransitionTime = 250;
    }

    slide.transitionTime =
      artificialTransitionTime >= 0 ? artificialTransitionTime : 0;
    this._slideDeck.selectedSlide = slide;
    slide.transitionTime = originalSlideTransitionTime;
    // this.displayAnnotationText(this._slideDeck.selectedSlide.mainAnnotation, 350);
    this.update();
  }

  private onMouseEnter() {
    let toolbar = d3.event.target.parentElement.querySelector(
      ".slide_toolbar"
    );
    toolbar.style.display = "block";
  }
  private onMouseLeave() {
    let toolbar = d3.event.target.parentElement.querySelector(
      ".slide_toolbar"
    );
    toolbar.style.display = "none";
  }

  private onAdd = () => {
    let slideDeck = this._slideDeck;
    const node = slideDeck.graph.current;
    const slide = new ProvenanceSlide(node.label, 5000, 0, [], node);
    slideDeck.addSlide(slide, slideDeck.slides.length);
    this.selectSlide(slide);
  }
  private onClone = (slide: IProvenanceSlide) => {
    let slideDeck = this._slideDeck;
    const cloneSlide = new ProvenanceSlide(
      slide.name,
      5000,
      0,
      [],
      slide.node
    );
    // cloneSlide.mainAnnotation = slide.mainAnnotation;
    slideDeck.addSlide(
      cloneSlide,
      slideDeck.selectedSlide
        ? slideDeck.slides.indexOf(slideDeck.selectedSlide) + 1
        : slideDeck.slides.length
    );
  }

  private moveDragStarted(draggedObject: any) {
    d3.select<any, any>(this)
      .raise()
      .classed("active", true);
  }

  private moveDragged = (that: any, draggedObject: any) => {
    d3.select<any, any>(that).attr(
      "transform",
      (slide: IProvenanceSlide) => {
        const originalX =
          this.previousSlidesWidth(slide) - this._timelineShift;
        const draggedX = d3.event.x;
        const myIndex = this._slideDeck.slides.indexOf(slide);

        if (draggedX < originalX && myIndex > 0) {
          // check upwards
          const previousSlide = this._slideDeck.slides[myIndex - 1];
          let previousSlideCenterY =
            this.previousSlidesWidth(previousSlide) -
            this._timelineShift +
            this.barTotalWidth(previousSlide) / 2;

          if (draggedX < previousSlideCenterY) {
            this._slideDeck.moveSlide(myIndex, myIndex - 1);
          }
        } else if (
          draggedX > originalX &&
          myIndex < this._slideDeck.slides.length - 1
        ) {
          // check downwards
          const nextSlide = this._slideDeck.slides[myIndex + 1];
          let nextSlideCenterY =
            this.previousSlidesWidth(nextSlide) -
            this._timelineShift +
            this.barTotalWidth(nextSlide) / 2;

          if (draggedX > nextSlideCenterY) {
            this._slideDeck.moveSlide(myIndex, myIndex + 1);
          }
        }

        if (this._draggedSlideReAdjustmentFactor === 0) {
          this._draggedSlideReAdjustmentFactor =
            draggedX - slide.xPosition;
        }
        let slidePosition =
          d3.event.x -
          this._draggedSlideReAdjustmentFactor -
          this._timelineShift;
        return "translate(" + slidePosition + ", 0)";
      }
    );
  }

  private moveDragended = (that: any, draggedObject: any) => {
    d3.select<any, any>(that)
      .classed("active", false)
      .attr("transform", (slide: IProvenanceSlide) => {
        return (
          "translate(" +
          (this.previousSlidesWidth(slide) +
            50 +
            this._resizebarwidth -
            this._timelineShift) +
          ", 0)"
        );
      });
    this._draggedSlideReAdjustmentFactor = 0;
  }

  private transitionTimeDragged = (that: any, slide: IProvenanceSlide) => {
    let transitionTime =
      Math.max(d3.event.x, 0) / this._barWidthTimeMultiplier;
    slide.transitionTime = this.getSnappedTime(slide, transitionTime, 0);
    this.update();
  }

  private transitionTimeSubject = (that: any, slide: IProvenanceSlide) => {
    return { x: this.barTransitionTimeWidth(slide) };
  }

  private durationDragged = (that: any, slide: IProvenanceSlide) => {
    let duration = Math.max(
      Math.max(d3.event.x, 0) / this._barWidthTimeMultiplier,
      this._minimumSlideDuration
    );
    slide.duration = this.getSnappedTime(slide, duration, 1);
    this.update();
  }

  private durationSubject = (that: any, slide: IProvenanceSlide) => {
    return { x: this.barDurationWidth(slide) };
  }

  private getSnappedTime = (
    slide: IProvenanceSlide,
    time: number,
    isDuration: number
  ) => {
    if (this._gridSnap) {
      let currentTime =
        this._slideDeck.startTime(slide) +
        slide.transitionTime * isDuration +
        time;
      let remainder = currentTime % this._gridTimeStep;
      if (remainder > this._gridTimeStep / 2) {
        return time + this._gridTimeStep - remainder;
      } else {
        return time - remainder;
      }
    }
    return time;
  }
  private barTransitionTimeWidth(slide: IProvenanceSlide) {
    let calculatedWidth =
      this._barWidthTimeMultiplier * slide.transitionTime;
    return Math.max(calculatedWidth, 0);
  }

  private barDurationWidth(slide: IProvenanceSlide) {
    let calculatedWidth = this._barWidthTimeMultiplier * slide.duration;
    return Math.max(
      calculatedWidth,
      this._minimumSlideDuration * this._barWidthTimeMultiplier
    );
  }

  private barTotalWidth(slide: IProvenanceSlide) {
    let calculatedWidth =
      this.barTransitionTimeWidth(slide) + this.barDurationWidth(slide);

    return calculatedWidth;
  }

  private previousSlidesWidth(slide: IProvenanceSlide) {
    let myIndex = this._slideDeck.slides.indexOf(slide);
    let calculatedWidth = 0;

    for (let i = 0; i < myIndex; i++) {
      calculatedWidth += this.barTotalWidth(this._slideDeck.slides[i]);
    }

    return calculatedWidth;
  }

  private updateTimeIndices(slideDeck: IProvenanceSlidedeck) {
    this._timeIndexedSlides = [];
    let timeIndex = 0;
    slideDeck.slides.forEach(slide => {
      this._timeIndexedSlides.push({
        slide: slide,
        startTime: timeIndex
      });
      timeIndex += slide.transitionTime + slide.duration;
    });
  }

  private rescaleTimeline = () => {
    let wheelDirection = d3.event.deltaY < 0 ? "up" : "down";
    if (d3.event.shiftKey) {
      let correctedShiftAmount =
        d3.event.x - (this._originPosition - this._timelineShift);
      if (wheelDirection === "down") {
        let scalingFactor = 0.2;
        if (this._placeholderX > this._tableWidth / 2) {
          this._barWidthTimeMultiplier *= 1 - scalingFactor;
          this._timelineShift -= correctedShiftAmount * scalingFactor;
        }
      } else {
        let scalingFactor = 0.25;
        this._barWidthTimeMultiplier *= 1 + scalingFactor;
        if (!(this._placeholderX - this._timelineShift < d3.event.x)) {
          this._timelineShift += correctedShiftAmount * scalingFactor;
        }
      }
      this.adjustGridScale();
    } else {
      let shiftAmount = 100;
      if (wheelDirection === "down") {
        this._timelineShift += shiftAmount;
      } else {
        this._timelineShift -= shiftAmount;
      }
    }
    this.update();
  }

  private onBackward = () => {
    this.stopPlaying();
    for (let i = this._timeIndexedSlides.length - 1; i >= 0; i--) {
      if (this._currentTime > this._timeIndexedSlides[i].startTime) {
        this._currentTime = this._timeIndexedSlides[i].startTime;
        this.update();
        break;
      }
    }
  }

  private playTimeline() {
    let intervalStepMS = 25;
    let playingID = setInterval(() => {
      if (!this._currentlyPlaying) {
        clearInterval(playingID);
      } else {
        this._currentTime += intervalStepMS;
        let currentSlide = this._slideDeck.slideAtTime(
          this._currentTime
        );
        if (currentSlide !== this._slideDeck.selectedSlide) {
          this.selectSlide(currentSlide);
        }
      }
      this.update();
    }, intervalStepMS);
  }

  private onPlay = () => {
    if (this._currentlyPlaying) {
      this.stopPlaying();
    } else {
      this.startPlaying();
    }
  }

  private startPlaying = () => {
    d3.select("foreignObject.player_play")
      .select("body")
      .html('<i class="fa fa-pause"></i>');
    this._currentlyPlaying = true;
    this.playTimeline();
  }

  private stopPlaying = () => {
    d3.select("foreignObject.player_play")
      .select("body")
      .html('<i class="fa fa-play"></i>');
    this._currentlyPlaying = false;
  }

  private onForward = () => {
    this.stopPlaying();
    for (let timedSlide of this._timeIndexedSlides) {
      if (this._currentTime < timedSlide.startTime) {
        this._currentTime = timedSlide.startTime;
        this.update();
        break;
      }
    }
  }

  private seekStarted = (that: any) => {
    if (this._currentlyPlaying) {
      this.stopPlaying();
    }
    this._currentTime =
      (d3.event.x - this._originPosition + this._timelineShift) /
      this._barWidthTimeMultiplier;
    this.update();
  }

  private seekDragged = (that: any) => {
    this._currentTime =
      (d3.event.x + this._timelineShift - this._originPosition) /
      this._barWidthTimeMultiplier;
    this.update();
  }

  private resizeTable() {
    this._tableWidth = window.innerWidth - 400;
    d3.select(".slide__table").attr("width", this._tableWidth);
    d3.select(".slides_background_rect").attr("width", this._tableWidth);
  }

  // private getTextWidth(text: string, fontSize: number, fontFace: string) {
  //     let canvas = document.createElement('canvas');
  //     let context = canvas.getContext('2d');
  //     if (context === null) {
  //         return 0;
  //     }
  //     context.font = fontSize + 'px ' + fontFace;
  //     return context.measureText(text).width;
  // }

  // private displayAnnotationText = (annotation: string, width: number) => {
  //     d3.selectAll("text.annotation").remove();
  //     let words = annotation.split(" ");
  //     let currentLine = "";
  //     let newLine = "";
  //     let y = 20;
  //     let fontSize = 20;
  //     words.forEach(word => {
  //         newLine = currentLine + word + " ";
  //         if (this.getTextWidth(newLine, fontSize - 1, "Arial") > width){
  //             d3.select("svg.annotation-area")
  //                 .append("text")
  //                 .attr("class", "annotation")
  //                 .attr("x", 10)
  //                 .attr("y", y)
  //                 .attr("font-size", fontSize)
  //                 .text(currentLine);
  //             y += 22;
  //             currentLine = word + " ";
  //         } else {
  //             currentLine = newLine;
  //         }
  //     });
  //     d3.select("svg.annotation-area")
  //             .append("text")
  //             .attr("class", "annotation")
  //             .attr("x", 10)
  //             .attr("y", y)
  //             .attr("font-size", fontSize)
  //             .text(currentLine);
  //     this.update();
  // }

  // private addAnnotation = () => {
  //     if(this._slideDeck.selectedSlide === null){
  //         alert("There is no slide currently selected!");
  //         return;
  //     }
  //     let newAnnotation =  prompt("Edit story: ", this._slideDeck.selectedSlide.mainAnnotation);
  //     if(newAnnotation !== null){
  //         this._slideDeck.selectedSlide.mainAnnotation = newAnnotation;
  //         if(newAnnotation.length > 150){
  //             alert("Find a way to describe your slide in less than 150 characters!");
  //             this.addAnnotation();
  //             return;
  //         }
  //     } else {
  //         this._slideDeck.selectedSlide.mainAnnotation = "";
  //     }
  //     this.displayAnnotationText(this._slideDeck.selectedSlide.mainAnnotation, 350);
  // }

  private adjustGridScale() {
    if (this._barWidthTimeMultiplier < 0.02) {
      this._gridTimeStep = 5000;
      return;
    }
    if (this._barWidthTimeMultiplier < 0.2) {
      this._gridTimeStep = 1000;
      return;
    }
    this._gridTimeStep = 200;
  }

  private drawGrid(maxWidth: number) {
    this._slideTable.selectAll("circle.gridTime").remove();
    let time = 0;
    let currentX =
      this._originPosition +
      time * this._barWidthTimeMultiplier -
      this._timelineShift;

    while (currentX < maxWidth) {
      let radius = time % (this._gridTimeStep * 5) === 0 ? 4 : 2;
      this._slideTable
        .append("circle")
        .attr("class", "gridTime")
        .attr("fill", "black")
        .attr("r", radius)
        .attr(
          "cx",
          this._originPosition +
          time * this._barWidthTimeMultiplier -
          this._timelineShift
        )
        .attr("cy", 65);
      time += this._gridTimeStep;
      currentX =
        this._originPosition +
        time * this._barWidthTimeMultiplier -
        this._timelineShift;
    }
    this._slideTable.selectAll("circle.gridTime").lower();
    this._slideTable.select("line.horizontal-line").lower();
  }

  private updateGridSnap = () => {
    if (d3.event.y === 540 || d3.event.y === 539) {
      // By far the biggest workaround in the history of code. If the mouse clicks here,
      // this event still fires, but the checkbox does not get checked. As a result, the gridsnap should
      // not be updated. This could all be avoided if I could check the checkbox property itself, but
      // for some reason, all my attempts at accessing the checkbox through d3 is turning up a null value.
      return;
    }
    if (this._gridSnap) {
      this._gridSnap = false;
    } else {
      this._gridSnap = true;
    }
  }

  private fixDrawingPriorities = () => {
    this._slideTable
      .select("rect.seek-dragger")
      .attr("width", this._placeholderX)
      .raise();
    this._slideTable.select("rect.mask").raise();
    this._slideTable.select("#player_placeholder").raise();
    this._slideTable.select("foreignObject.player_backward").raise();
    this._slideTable.select("foreignObject.player_play").raise();
    this._slideTable.select("foreignObject.player_forward").raise();
  }

  private displayGridLevel = () => {
    d3.select("text.grid_display").text(
      "Grid step: " + (this._gridTimeStep / 1000).toFixed(2) + " Sec"
    );
  }

  private drawSeekBar = () => {
    const timeWidth = this._currentTime * this._barWidthTimeMultiplier;

    if (timeWidth >= this._placeholderX) {
      this.stopPlaying();
      this._currentTime =
        this._placeholderX / this._barWidthTimeMultiplier;
    }

    if (this._currentTime < 0) {
      this._currentTime = 0;
    }

    const shiftedPosition =
      this._originPosition + timeWidth - this._timelineShift;
    this._slideTable
      .select("circle.currentTime")
      .attr("cx", shiftedPosition)
      .raise();
    this._slideTable
      .select("line.vertical-line-seek")
      .attr("x1", shiftedPosition)
      .attr("y1", 65)
      .attr("x2", shiftedPosition)
      .attr("y2", 0)
      .raise();
  }

  private adjustSlideAddObjectPosition = () => {
    this._slideTable
      .select("foreignObject.slide_add")
      .attr("x", this._placeholderX + 105 - this._timelineShift)
      .attr("y", 15);
  }

  private adjustHorizontalLine = () => {
    this._slideTable
      .select("line.horizontal-line")
      .attr("x2", this._placeholderX + 60 - this._timelineShift);
  }

  public update() {
    this.updateTimeIndices(this._slideDeck);
    if (this._timelineShift < 0) {
      this._timelineShift = 0;
    }
    const allExistingNodes = this._slideTable
      .selectAll("g.slide")
      .data<any>(this._slideDeck.slides, (d: IProvenanceSlide) => {
        return d.id;
      });

    const that = this;

    const newNodes = allExistingNodes
      .enter()
      .append("g")
      .attr("class", "slide")
      .call(
        (d3.drag() as any)
          .clickDistance([2, 2])
          .on("start", this.moveDragStarted)
          .on("drag", firstArgThis(this.moveDragged))
          .on("end", firstArgThis(this.moveDragended))
      );

    newNodes
      .append("rect")
      .attr("class", "slides_transitionTime_rect")
      .attr("x", this._resizebarwidth)
      .attr("y", 0)
      .attr("height", 60)
      .on("click", this.onSelect);

    let slideGroup = newNodes
      .append("g")
      .attr("transform", "translate(5,0)")
      .attr("class", "slide_group")
      .on("mouseenter", this.onMouseEnter)
      .on("mouseleave", this.onMouseLeave);

    slideGroup
      .append("rect")
      .attr("class", "slides_rect")
      .attr("height", 60)
      .attr("cursor", "move")
      .on("click", this.onSelect);

    slideGroup
      .append("svg")
      .attr("class", "text-viewport")
      .attr("height", 60)
      .append("text")
      .attr("class", "slides_text")
      .attr("y", this._resizebarwidth + 2 * this._barPadding)
      .attr("font-size", 20)
      .attr("dy", ".35em");

    const textPosition = this._resizebarwidth + 4 * this._barPadding + 68;

    slideGroup
      .append("text")
      .attr("class", "slides_transitionTimetext")
      .attr("y", textPosition)
      .attr("font-size", 16)
      .attr("dy", "-.65em");

    let toolbar = slideGroup.append("g").attr("class", "slide_toolbar");

    toolbar
      .append("svg:foreignObject")
      .attr("class", "slides_delete_icon")
      .attr("cursor", "pointer")
      .attr("width", 20)
      .attr("height", 20)
      .append("xhtml:body")
      .on("click", this.onDelete)
      .html('<i class="fa fa-trash-o"></i>');

    toolbar
      .append("svg:foreignObject")
      .attr("class", "slides_clone_icon")
      .attr("cursor", "pointer")
      .attr("width", 20)
      .attr("height", 20)
      .append("xhtml:body")
      .on("click", this.onClone)
      .html('<i class="fa fa-copy"></i>');

    const placeholder = this._slideTable.select("rect.slides_placeholder");

    newNodes
      .append("text")
      .attr("class", "slides_durationtext")
      .attr("y", textPosition)
      .attr("font-size", 16)
      .attr("dy", "-.65em");

    newNodes
      .append("circle")
      .attr("class", "time")
      .attr("cy", this._resizebarwidth + 60)
      .attr("r", 4)
      .attr("fill", "blue");

    newNodes
      .append("circle")
      .attr("class", "transitionTime_time")
      .attr("cy", this._resizebarwidth + 60)
      .attr("r", 4)
      .attr("fill", "blue");

    newNodes
      .append("rect")
      .attr("class", "slides_duration_resize")
      .attr("x", 0)
      .attr("width", this._resizebarwidth)
      .attr("height", 60)
      .attr("cursor", "ew-resize")
      .call(
        (d3.drag() as any)
          .subject(firstArgThis(this.durationSubject))
          .on("drag", firstArgThis(this.durationDragged))
      );

    newNodes
      .append("rect")
      .attr("class", "slides_transitionTime_resize")
      .attr("y", 0)
      .attr("width", this._resizebarwidth)
      .attr("height", 60)
      .attr("cursor", "ew-resize")
      .call(
        (d3.drag() as any)
          .subject(firstArgThis(this.transitionTimeSubject))
          .on("drag", firstArgThis(this.transitionTimeDragged))
      );
    d3.select(".slide__table").on("wheel", this.rescaleTimeline);

    // Update all nodes

    const allNodes = newNodes
      .merge(allExistingNodes as any)
      .attr("transform", (slide: IProvenanceSlide) => {
        this._previousSlideX = this.previousSlidesWidth(slide);
        slide.xPosition =
          50 + this._resizebarwidth + this.previousSlidesWidth(slide);
        return (
          "translate(" +
          (slide.xPosition - this._timelineShift) +
          ", 0 )"
        );
      });

    allNodes
      .select("rect.slides_transitionTime_rect")
      .attr("width", (slide: IProvenanceSlide) => {
        return this.barTransitionTimeWidth(slide);
      });

    allNodes
      .select("rect.slides_transitionTime_resize")
      .attr("x", (slide: IProvenanceSlide) => {
        return (
          this.barTransitionTimeWidth(slide) + this._resizebarwidth
        );
      });

    slideGroup = allNodes.select("g.slide_group");

    slideGroup
      .select("rect.slides_rect")
      .attr("selected", (slide: IProvenanceSlide) => {
        return this._slideDeck.selectedSlide === slide;
      })
      .attr("x", (slide: IProvenanceSlide) => {
        return this.barTransitionTimeWidth(slide);
      })
      .attr("width", (slide: IProvenanceSlide) => {
        this._placeholderX =
          this._previousSlideX +
          this.barDurationWidth(slide) +
          this.barTransitionTimeWidth(slide);
        return this.barDurationWidth(slide);
      });

    slideGroup
      .select("svg.text-viewport")
      .attr("x", (slide: IProvenanceSlide) => {
        return this.barTransitionTimeWidth(slide);
      })
      .attr("width", (slide: IProvenanceSlide) => {
        return this.barDurationWidth(slide) - 5;
      });

    toolbar = allNodes.select("g.slide_toolbar");

    toolbar
      .select("foreignObject.slides_delete_icon")
      .attr("y", (slide: IProvenanceSlide) => {
        return this._toolbarY;
      })
      .attr("x", (slide: IProvenanceSlide) => {
        return this._toolbarX + this.barTransitionTimeWidth(slide) - 3;
      });

    toolbar
      .select("foreignObject.slides_clone_icon")
      .attr("y", (slide: IProvenanceSlide) => {
        return this._toolbarY;
      })
      .attr("x", (slide: IProvenanceSlide) => {
        return (
          this._toolbarX +
          this._toolbarPadding +
          this.barTransitionTimeWidth(slide) -
          3
        );
      });

    slideGroup
      .select("text.slides_text")
      .attr("x", (slide: IProvenanceSlide) => {
        return this._barPadding * 2 - 2;
      })
      .text((slide: IProvenanceSlide) => {
        return slide.name;
      });

    slideGroup
      .select("text.slides_transitionTimetext")
      .attr("x", (slide: IProvenanceSlide) => {
        return (
          this.barTransitionTimeWidth(slide) + this._barPadding * 2
        );
      })
      .text((slide: IProvenanceSlide) => {
        if (
          this.barTransitionTimeWidth(slide) > 35 ||
          this._slideDeck.startTime(slide) === 0
        ) {
          return (
            (this._slideDeck.startTime(slide) +
              slide.transitionTime) /
            1000
          ).toFixed(2);
        } else {
          return "";
        }
      });

    allNodes.select("circle.time").attr("cx", (slide: IProvenanceSlide) => {
      return this.barTotalWidth(slide) + this._resizebarwidth;
    });

    allNodes
      .select("circle.transitionTime_time")
      .attr("cx", (slide: IProvenanceSlide) => {
        return (
          this.barTransitionTimeWidth(slide) + this._resizebarwidth
        );
      });

    allNodes
      .select("rect.slides_duration_resize")
      .attr("x", (slide: IProvenanceSlide) => {
        return this.barTotalWidth(slide);
      });

    allNodes
      .select("text.slides_durationtext")
      .attr("x", (slide: IProvenanceSlide) => {
        return this.barTotalWidth(slide) + this._barPadding + 10;
      })
      .text((slide: IProvenanceSlide) => {
        return (
          (this._slideDeck.startTime(slide) +
            slide.duration +
            slide.transitionTime) /
          1000
        ).toFixed(2);
      });

    placeholder.attr("x", this._placeholderX + 80 - this._timelineShift);

    this.adjustHorizontalLine();

    this.adjustSlideAddObjectPosition();

    this.drawSeekBar();

    this.drawGrid(
      this._placeholderX + this._originPosition - this._timelineShift
    );

    this.fixDrawingPriorities();

    this.displayGridLevel();

    allExistingNodes.exit().remove();
  }

  constructor(slideDeck: IProvenanceSlidedeck, elm: HTMLDivElement) {
    this._tableWidth = window.innerWidth - 400;
    window.addEventListener("resize", this.resizeTable);
    this._slideDeck = slideDeck;
    this._root = d3.select(elm);

    this._slideTable = this._root
      .append<SVGElement>("svg")
      .attr("class", "slide__table")
      .attr("height", this._tableHeight)
      .attr("width", this._tableWidth);

    this._slideTable
      .append("rect")
      .attr("class", "slides_background_rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", this._tableHeight)
      .attr("width", this._tableWidth);

    this._slideTable
      .append("line")
      .attr("class", "vertical-line")
      .attr("x1", this._lineX1)
      .attr("y1", 0)
      .attr("x2", this._lineX1)
      .attr("y2", 100)
      .attr("stroke", "gray")
      .attr("stroke-width", 2);

    this._slideTable
      .append("line")
      .attr("class", "horizontal-line")
      .attr("x1", this._lineX1)
      .attr("y1", this._resizebarwidth + this._originPosition)
      .attr("y2", this._resizebarwidth + this._originPosition)
      .attr("stroke", "gray")
      .attr("stroke-width", 2);

    this._slideTable
      .append("rect")
      .attr("class", "seek-dragger")
      .attr("fill", "transparent")
      .attr("x", this._originPosition)
      .attr("y", this._originPosition)
      .attr("height", 12)
      .attr("width", 12)
      .attr("cursor", "pointer")
      .call(
        (d3.drag() as any)
          .on("start", firstArgThis(this.seekStarted))
          .on("drag", firstArgThis(this.seekDragged))
      );

    this._slideTable
      .append("rect")
      .attr("class", "slides_placeholder")
      .attr("x", this._lineX1 + this._barPadding)
      .attr("y", 0)
      .attr("width", this._placeholderWidth)
      .attr("height", this._placeholderHeight);

    this._slideTable
      .append("circle")
      .attr("class", "currentTime")
      .attr("fill", "red")
      .attr("r", 4)
      .attr("cx", this._originPosition)
      .attr("cy", 65);

    this._slideTable
      .append("line")
      .attr("class", "vertical-line-seek")
      .attr("x1", this._originPosition)
      .attr("y1", 65)
      .attr("x2", this._originPosition)
      .attr("y2", 0)
      .attr("stroke", "red")
      .attr("stroke-width", 1);

    this._slideTable
      .append("svg:foreignObject")
      .attr("class", "slide_add")
      .attr("x", this._placeholderX + 18)
      .attr("cursor", "pointer")
      .attr("width", 30)
      .attr("height", 30)
      .append("xhtml:body")
      .on("click", this.onAdd)
      .html('<i class="fa fa-file-text-o"></i>');

    this._slideTable
      .append("rect")
      .attr("class", "mask")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 50)
      .attr("height", 100)
      .attr("fill", "white");

    this._slideTable
      .append("rect")
      .attr("class", "slides_placeholder")
      .attr("id", "player_placeholder")
      .attr("x", 15)
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", 75);

    this._slideTable
      .append("svg:foreignObject")
      .attr("class", "player_backward")
      .attr("x", 22)
      .attr("y", 5)
      .attr("cursor", "pointer")
      .attr("width", 20)
      .attr("height", 20)
      .append("xhtml:body")
      .on("click", this.onBackward)
      .html('<i class="fa fa-backward"></i>');

    this._slideTable
      .append("svg:foreignObject")
      .attr("class", "player_play")
      .attr("x", 22)
      .attr("y", 25)
      .attr("cursor", "pointer")
      .attr("width", 20)
      .attr("height", 20)
      .append("xhtml:body")
      .on("click", this.onPlay)
      .html('<i class="fa fa-play"></i>');

    this._slideTable
      .append("svg:foreignObject")
      .attr("class", "player_forward")
      .attr("x", 22)
      .attr("y", 45)
      .attr("cursor", "pointer")
      .attr("width", 20)
      .attr("height", 20)
      .append("xhtml:body")
      .on("click", this.onForward)
      .html('<i class="fa fa-forward"></i>');

    this._slideTable
      .append("text")
      .attr("class", "grid_display")
      .attr("x", this._originPosition + 10)
      .attr("y", 110);

    this._slideTable
      .append("text")
      .attr("class", "checkBox_text")
      .attr("x", this._originPosition + 195)
      .attr("y", 110)
      .text("Grid Snap");

    this._slideTable
      .append("foreignObject")
      .attr("width", 13)
      .attr("height", 15)
      .attr("x", this._originPosition + 175)
      .attr("y", 96)
      .append("xhtml:body")
      .html("<form><input type=checkbox class=gridSnap/></form>")
      .on("click", this.updateGridSnap);

    // let area = this._root
    //     .append<SVGElement>("svg")
    //     .attr("class", "annotation-area")
    //     .attr("x", this._tableWidth + 5)
    //     .attr("y", 0)
    //     .attr("width", 350)
    //     .attr("height", 150);
    // area
    //     .append("rect")
    //     .attr("class", "slides_placeholder")
    //     .attr("id", "annotation-box")
    //     .attr("x", 0)
    //     .attr("y", 0)
    //     .attr("width", 350)
    //     .attr("height", 100);
    // area
    //     .append("text")
    //     .attr("x", 10)
    //     .attr("y", 120)
    //     .attr("font-size", 18)
    //     .text("Edit slide story");
    // area
    //     .append("rect")
    //     .attr("class", "add_annotation")
    //     .attr("x", 0)
    //     .attr("y", 100)
    //     .attr("width", 150)
    //     .attr("height", 30)
    //     .attr("cursor", "pointer")
    //     .attr("fill", "transparent")
    //     .on("click", this.addAnnotation);

    slideDeck.on("slideAdded", () => this.update());
    slideDeck.on("slideRemoved", () => this.update());
    slideDeck.on("slidesMoved", () => this.update());
    slideDeck.on("slideSelected", () => this.update());

    this.update();
  }
}
