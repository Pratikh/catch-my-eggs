import React, { Component } from 'react';
import './components.css';
import chickenGif from '../assets/chicken.png';
import { TweenMax } from "gsap";
import _ from 'lodash'

class Chicken extends Component{
  constructor(props){
    super(props);
    this.array = [];
    this.state = {
      left:'0%',
    }
    this.generatePositionArray();
    window.chicken = this;
  }

  componentDidMount(){
    this.moveChicken();
  }

  generatePositionArray(){
    for(let i=0;i<100;i++){
      this.array.push({ index:i,left:`${i}%`});
    }
  }

  moveChicken(){
    const left = {
      left : this.getNumberForPercentage(this.state.left)
    }
    const moveTo = this.getNumberForPercentage(this.shuffledStartingValue.left);
    console.log(left);
    TweenMax.to(left,1,{
      left:moveTo,
      onUpdate:()=>{
      this.setState({
        left:`${left.left}%`,
      })
    },
    onComplete:()=>this.moveChicken()
  })
  }

  getNumberForPercentage(value){
    return Number(value.split('%')[0]);
  }

  get shuffledStartingValue(){
    return _.shuffle(this.array)[0];
  }

  render(){
      return (
        <div>
          <img src={chickenGif} alt={'Background'} className="chicken" style={{left:this.state.left}}></img>
        </div>
      );
  }
}

export default Chicken;
