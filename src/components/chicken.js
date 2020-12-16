import './components.css';
import chickenGif from '../assets/giphy.gif';

 function Chicken() {
  return (
    <div>
      <img src={chickenGif} alt={'Background'} className="chicken"></img>
    </div>
  );
}

export default Chicken;
