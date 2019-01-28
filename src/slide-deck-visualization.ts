import * as d3 from "d3";

import "./style.css";

import {
    IProvenanceSlide,
    ProvenanceSlide,
    IProvenanceSlidedeck,
    ProvenanceSlidedeckPlayer,
    STATUS
} from "@visualstorytelling/provenance-core";
import { all } from "q";
import { Stats } from "fs";

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
    private _tableHeight = 1000;
    private _tableWidth = 300;
    private _minimumSlideDuration = 5000;
    private _barHeightTimeMultiplier = 0.01;
    private _barWidth = 270;
    private _barPadding = 5;
    private _resizebarheight = 5;
    private _previousSlideY = 0;
    private _lineX1 = 30;
    private _placeholderWidth = this._tableWidth - 40;
    private _placeholderY = 50;
    private _placeholderHeight = 30;
    private _maxSlides = 20;
    private _toolbarX = 200;
    private _toolbarPadding = 20;
    private _slideDuration = 1000;
    private _timeIndexedSlides: IndexedSlide[] = [];
    private _player: ProvenanceSlidedeckPlayer<IProvenanceSlide>;
    private _nextSlideY = 50;
    private _svgTimePointer: any;
    private _isResume = false;
    private _index = (slide: IProvenanceSlide): number => {
        return this._slideDeck.slides.indexOf(slide);
    }

    private onDelete = (slide: IProvenanceSlide) => {
        this._slideDeck.removeSlide(slide);
    }
    private getCurrentY(slide: IProvenanceSlide) {
        this._nextSlideY = 50;
        let currentSlideIndex = this._index(slide);
        for (let i = 0; i < currentSlideIndex; i++) {
            this._nextSlideY += this.barTotalHeight(this._slideDeck.slides[i]);
        }
        this.animateTimer(0);
    }
    private onSelect = (slide: IProvenanceSlide) => {
        if (d3.event.defaultPrevented) return;
        this._slideDeck.selectedSlide = slide;
        this.getCurrentY(slide);
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
        const slide = new ProvenanceSlide(node.label, 1000, 0, [], node);
        slideDeck.addSlide(
            slide,
            slideDeck.selectedSlide
                ? slideDeck.slides.indexOf(slideDeck.selectedSlide) + 1
                : slideDeck.slides.length
        );
    }
    private onClone = (slide: IProvenanceSlide) => {
        let slideDeck = this._slideDeck;
        const cloneSlide = new ProvenanceSlide(
            slide.name,
            1000,
            0,
            [],
            slide.node
        );
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
                const originalY = this.previousSlidesHeight(slide);
                const draggedY = d3.event.y;
                const myIndex = this._slideDeck.slides.indexOf(slide);

                if (draggedY < originalY && myIndex > 0) {
                    // check upwards
                    const previousSlide = this._slideDeck.slides[myIndex - 1];
                    let previousSlideCenterY =
                        this.previousSlidesHeight(previousSlide) +
                        this.barTotalHeight(previousSlide) / 2;

                    if (draggedY < previousSlideCenterY) {
                        this._slideDeck.moveSlide(myIndex, myIndex - 1);
                    }
                } else if (
                    draggedY > originalY &&
                    myIndex < this._slideDeck.slides.length - 1
                ) {
                    // check downwards
                    const nextSlide = this._slideDeck.slides[myIndex + 1];
                    let nextSlideCenterY =
                        this.previousSlidesHeight(nextSlide) +
                        this.barTotalHeight(nextSlide) / 2;

                    if (draggedY > nextSlideCenterY) {
                        this._slideDeck.moveSlide(myIndex, myIndex + 1);
                    }
                }

                return "translate(30," + d3.event.y + ")";
            }
        );
    }

    private moveDragended = (that: any, draggedObject: any) => {
        d3.select<any, any>(that)
            .classed("active", false)
            .attr("transform", (slide: IProvenanceSlide) => {
                return "translate(30," + this.previousSlidesHeight(slide) + ")";
            });
    }

    private delayDragged = (that: any, slide: IProvenanceSlide) => {
        slide.delay = Math.max(0, d3.event.y) / this._barHeightTimeMultiplier;
        this.update();
    }

    private delaySubject = (that: any, slide: IProvenanceSlide) => {
        return { y: this.barDelayHeight(slide) };
    }

    private durationDragged = (that: any, slide: IProvenanceSlide) => {
        slide.duration =
            Math.max(0, d3.event.y) / this._barHeightTimeMultiplier;
        this.update();
    }

    private durationSubject = (that: any, slide: IProvenanceSlide) => {
        return { y: this.barDurationHeight(slide) };
    }

    private barDelayHeight(slide: IProvenanceSlide) {
        let calculatedHeight = this._barHeightTimeMultiplier * slide.delay;
        return Math.max(calculatedHeight, 0);
    }

    private barDurationHeight(slide: IProvenanceSlide) {
        let calculatedHeight = this._barHeightTimeMultiplier * slide.duration;
        return Math.max(
            calculatedHeight,
            this._minimumSlideDuration * this._barHeightTimeMultiplier
        );
    }

    private barTotalHeight(slide: IProvenanceSlide) {
        let calculatedHeight =
            this.barDelayHeight(slide) +
            this.barDurationHeight(slide) +
            2 * this._resizebarheight;

        return calculatedHeight;
    }

    private previousSlidesHeight(slide: IProvenanceSlide) {
        let myIndex = this._slideDeck.slides.indexOf(slide);
        let calculatedHeight = 50;

        for (let i = 0; i < myIndex; i++) {
            calculatedHeight += this.barTotalHeight(this._slideDeck.slides[i]);
        }

        return calculatedHeight;
    }

    private updateTimeIndices(slideDeck: IProvenanceSlidedeck) {
        this._timeIndexedSlides = [];
        let timeIndex = 0;
        slideDeck.slides.forEach(slide => {
            this._timeIndexedSlides.push({
                slide: slide,
                startTime: timeIndex
            });
            timeIndex += slide.delay + slide.duration;
        });
    }
    private onNext = () => {
        this._slideDeck.next();
        this.updateTimePointer(false);
    }
    private updateTimePointer(isPrev: boolean) {
        let selectedSlide = this._slideDeck.selectedSlide;
        if (selectedSlide) {
            this.updateNextSlideY(selectedSlide, isPrev);
            this.animateTimer(0);
        }
    }
    private onPrevious = () => {
        this._slideDeck.previous();
        this.updateTimePointer(true);
    }
    private onPlay = () => {
        if (this._player.status === STATUS.IDLE) {
            let selectedSlide = this._slideDeck.selectedSlide;
            if (selectedSlide) {
                this._player.currentSlideIndex = this._index(selectedSlide);
                this._player.play();
            }
        } else {
            this._player.stop();
            this._isResume = true;
            this.startPlayer();
        }

        d3.select(d3.event.target).classed(
            "fa-play",
            d3.select(d3.event.target).classed("fa-play") ? false : true
        );
        d3.select(d3.event.target).classed(
            "fa-pause",
            d3.select(d3.event.target).classed("fa-pause") ? false : true
        );
    }
    private startPlayer() {
        if (this._player.status === STATUS.PLAYING) {
            this.animateTimer(this._slideDuration);
        } else {
            this._svgTimePointer.interrupt();
        }
    }
    private animateTimer(duration: number) {
        this._svgTimePointer
            .transition()
            .ease(d3.easeLinear)
            .duration(duration)
            .attr("cy", this._nextSlideY)
            .on("end", () => this.isLastSlide());
    }
    private updateNextSlideY(slide: IProvenanceSlide, isPrevious: boolean) {
        if (!isPrevious) {
            this._nextSlideY += this.barTotalHeight(slide);
            console.log("Total", this._nextSlideY);
        } else {
            this._nextSlideY -= this.barTotalHeight(slide);
        }
    }

    isLastSlide() {
        if (this._slideDeck.selectedSlide !== null) {
            if (
                this._slideDeck.slides.indexOf(
                    this._slideDeck.selectedSlide
                ) ===
                this._slideDeck.slides.length - 1
            ) {
                setTimeout(() => {
                    this._nextSlideY = 50;
                    this._svgTimePointer.attr("cy", this._nextSlideY);
                    this._slideDeck.selectedSlide = this._slideDeck.slides[0];
                    this._slideTable
                        .select(".fa-pause")
                        .classed("fa-play", true)
                        .classed("fa-pause", false);
                    this._player.stop();
                    this._player.currentSlideIndex = 0;
                }, this._slideDeck.selectedSlide.duration + 2000);
            }
        }
    }
    public update() {
        this.updateTimeIndices(this._slideDeck);

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
            .attr("class", "slides_delay_resize")
            .attr("x", this._barPadding)
            .attr("width", this._barWidth - 2 * this._barPadding)
            .attr("height", this._resizebarheight)
            .attr("cursor", "ns-resize")
            .call(
                (d3.drag() as any)
                    .subject(firstArgThis(this.delaySubject))
                    .on("drag", firstArgThis(this.delayDragged))
            );

        newNodes
            .append("rect")
            .attr("class", "slides_delay_rect")
            .attr("x", this._barPadding)
            .attr("y", 0)
            .attr("width", this._barWidth - 2 * this._barPadding)
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
            .attr("width", this._barWidth - 2 * this._barPadding)
            .attr("cursor", "move")
            .on("click", this.onSelect);

        slideGroup
            .append("text")
            .attr("class", "slides_text")
            .attr("x", 2 * this._barPadding)
            .attr("dy", ".35em");

        slideGroup
            .append("text")
            .attr("class", "slides_delaytext")
            .attr("x", 2 * this._barPadding)
            .attr("dy", ".35em");
        let toolbar = slideGroup.append("g").attr("class", "slide_toolbar");
        toolbar
            .append("svg:foreignObject")
            .attr("class", "slides_delete_icon")
            .attr("x", this._toolbarX)
            .attr("cursor", "pointer")
            .attr("width", 20)
            .attr("height", 20)
            .append("xhtml:body")
            .on("click", this.onDelete)
            .html('<i class="fa fa-trash-o"></i>');

        toolbar
            .append("svg:foreignObject")
            .attr("class", "slides_clone_icon")
            .attr("x", this._toolbarX + this._toolbarPadding)
            .attr("cursor", "pointer")
            .attr("width", 20)
            .attr("height", 20)
            .append("xhtml:body")
            .on("click", this.onClone)
            .html('<i class="fa fa-copy"></i>');

        const slidePlaceholder = this._slideTable.select(
            "rect#slide_placeholder"
        );
        const playerPlaceholder = this._slideTable.select(
            "rect#player_placeholder"
        );
        newNodes
            .append("text")
            .attr("class", "slides_durationtext")
            .attr("x", this._barPadding - 30)
            .attr("dy", "-.65em");

        newNodes
            .append("circle")
            .attr("class", "time")
            .attr("cx", 0)
            .attr("r", 3)
            .attr("fill", "black");

        newNodes
            .append("rect")
            .attr("class", "slides_duration_resize")
            .attr("x", this._barPadding)
            .attr("width", this._barWidth - 2 * this._barPadding)
            .attr("height", this._resizebarheight)
            .attr("cursor", "ns-resize")
            .call(
                (d3.drag() as any)
                    .subject(firstArgThis(this.durationSubject))
                    .on("drag", firstArgThis(this.durationDragged))
            );

        // Update all nodes

        const allNodes = newNodes
            .merge(allExistingNodes)
            .attr("transform", (slide: IProvenanceSlide) => {
                this._previousSlideY = this.previousSlidesHeight(slide);
                return "translate(30," + this.previousSlidesHeight(slide) + ")";
            });

        allNodes
            .select("rect.slides_delay_rect")
            .attr("height", (slide: IProvenanceSlide) => {
                return this.barDelayHeight(slide);
            });

        allNodes
            .select("rect.slides_delay_resize")
            .attr("y", (slide: IProvenanceSlide) => {
                return this.barDelayHeight(slide);
            });
        slideGroup = allNodes.select("g.slide_group");
        slideGroup
            .select("rect.slides_rect")
            .attr("selected", (slide: IProvenanceSlide) => {
                return this._slideDeck.selectedSlide === slide;
            })
            .attr("y", (slide: IProvenanceSlide) => {
                return this.barDelayHeight(slide) + this._resizebarheight;
            })
            .attr("height", (slide: IProvenanceSlide) => {
                this._placeholderY =
                    this._previousSlideY +
                    this.barDurationHeight(slide) +
                    this.barDelayHeight(slide) +
                    this._resizebarheight;
                return this.barDurationHeight(slide);
            });

        toolbar = allNodes.select("g.slide_toolbar");
        toolbar
            .select("foreignObject.slides_delete_icon")
            .attr("y", (slide: IProvenanceSlide) => {
                return (
                    this.barDelayHeight(slide) +
                    this._resizebarheight +
                    2 * this._barPadding
                );
            });
        toolbar
            .select("foreignObject.slides_clone_icon")
            .attr("y", (slide: IProvenanceSlide) => {
                return (
                    this.barDelayHeight(slide) +
                    this._resizebarheight +
                    2 * this._barPadding
                );
            });
        slideGroup
            .select("text.slides_text")
            .attr("y", (slide: IProvenanceSlide) => {
                return (
                    this.barDelayHeight(slide) +
                    this._resizebarheight +
                    2 * this._barPadding
                );
            })
            .text((slide: IProvenanceSlide) => {
                return slide.name;
            });

        slideGroup
            .select("text.slides_delaytext")
            .attr("y", (slide: IProvenanceSlide) => {
                return (
                    this.barDelayHeight(slide) +
                    this._resizebarheight +
                    1 * this._barPadding +
                    25
                );
            })
            .text((slide: IProvenanceSlide) => {
                return "transition: " + slide.delay / 1000;
            });

        allNodes.select("circle.time").attr("cy", (slide: IProvenanceSlide) => {
            return this.barDelayHeight(slide) + this._resizebarheight;
        });
        allNodes
            .select("rect.slides_duration_resize")
            .attr("y", (slide: IProvenanceSlide) => {
                return this.barTotalHeight(slide) - this._resizebarheight;
            });
        allNodes
            .select("text.slides_durationtext")
            .attr("y", (slide: IProvenanceSlide) => {
                return (
                    this.barDelayHeight(slide) +
                    this._resizebarheight +
                    4 * this._barPadding -
                    7
                );
            })
            .text((slide: IProvenanceSlide) => {
                return slide.duration / 1000;
            });

        slidePlaceholder.attr("y", this._placeholderY + 20);
        playerPlaceholder.attr("y", 5);
        this._slideTable.select("line").attr("y2", this._placeholderY + 20);
        this._slideTable
            .select("foreignObject.slide_add")
            .attr("y", this._placeholderY + 26);
        this.startPlayer();
        allExistingNodes.exit().remove();
    }

    private dragEnded = (that: any, draggedObject: any) => {
        d3.select<any, any>(that)
            .transition()
            .ease(d3.easeLinear)
            .duration(0)
            .attr("cy", d3.event.y);
        console.log("dragged", d3.event.y);
    }
    constructor(slideDeck: IProvenanceSlidedeck, elm: HTMLDivElement) {
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
            .attr("x1", this._lineX1)
            .attr("y1", this._nextSlideY)
            .attr("x2", this._lineX1)
            .attr("stroke", "gray")
            .attr("stroke-width", 2);
        this._svgTimePointer = this._slideTable
            .append("circle")
            .attr("class", "currentTime")
            .attr("cx", this._lineX1)
            .attr("cy", this._nextSlideY)
            .attr("r", 3)
            .attr("fill", "red")
            .call(
                (d3.drag() as any)
                    .clickDistance([2, 2])
                    .on("end", firstArgThis(this.dragEnded))
            );
        this.setPlaceholder("slide_placeholder");
        this.setPlaceholder("player_placeholder");
        this.setAddButton();

        this.setPreviousButton();
        this.setPlayButton();
        this.setNextButton();
        this._player = new ProvenanceSlidedeckPlayer(
            this._slideDeck.slides,
            nextSlide => {
                this._slideDuration = nextSlide.duration;
                if (!this._isResume) {
                    this.updateNextSlideY(nextSlide, false);
                } else {
                    this._isResume = false;
                }
                this._slideDeck.selectedSlide = nextSlide;
            }
        );
        slideDeck.on("slideAdded", () => this.update());
        slideDeck.on("slideRemoved", () => this.update());
        slideDeck.on("slidesMoved", () => this.update());
        slideDeck.on("slideSelected", () => this.update());

        this.update();
    }

    private setPlaceholder(id: string) {
        this._slideTable
            .append("rect")
            .attr("id", id)
            .attr("class", "slides_placeholder")
            .attr("x", this._lineX1 + this._barPadding)
            .attr("y", 0)
            .attr("width", this._placeholderWidth)
            .attr("height", this._placeholderHeight);
    }
    private setAddButton() {
        this._slideTable
            .append("svg:foreignObject")
            .attr("class", "slide_add")
            .attr("x", (this._tableWidth - 40) / 2)
            .attr("cursor", "pointer")
            .attr("width", 30)
            .attr("height", 30)
            .append("xhtml:body")
            .on("click", this.onAdd)
            .html('<i class="fa fa-file-text-o"></i>');
    }

    private setPlayButton() {
        this._slideTable
            .append("svg:foreignObject")
            .attr("id", "slide_play")
            .attr("x", (this._tableWidth - 40) / 2 + 30)
            .attr("y", 10)
            .attr("cursor", "pointer")
            .attr("width", 30)
            .attr("height", 30)
            .append("xhtml:body")
            .on("click", this.onPlay)
            .html('<i class="fa fa-play"></i>');
    }
    private setNextButton() {
        this._slideTable
            .append("svg:foreignObject")
            .attr("x", (this._tableWidth - 40) / 2 + 60)
            .attr("y", 10)
            .attr("cursor", "pointer")
            .attr("width", 30)
            .attr("height", 30)
            .append("xhtml:body")
            .on("click", this.onNext)
            .html('<i class="fa fa-step-forward"></i>');
    }
    private setPreviousButton() {
        this._slideTable
            .append("svg:foreignObject")
            .attr("x", (this._tableWidth - 40) / 2 - 10)
            .attr("y", 10)
            .attr("cursor", "pointer")
            .attr("width", 30)
            .attr("height", 30)
            .append("xhtml:body")
            .on("click", this.onPrevious)
            .html('<i class="fa fa-step-backward"></i>');
    }
}
