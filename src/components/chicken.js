import './components.css';
import chickenGif from '../assets/chicken.png';

 function Chicken() {
  return (
    <div>
      <img src={chickenGif} alt={'Background'} className="chicken"></img>
    </div>
  );
}

export default Chicken;
