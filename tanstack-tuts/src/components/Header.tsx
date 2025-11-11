import './header.scss'

type HeaderProps = {
  message?: string;
}; /* use `interface` if exporting so that consumers can extend */

// Easiest way to declare a Function Component; return type is inferred.
const Header = ({ message = 'shahbz' }: HeaderProps) => (
  <div className="header_container">
<div className="left">FlavourAnime</div>
    <div className="flex g8 center">
      <p>Form</p>
      <p>Shows</p>
      <p>News</p>
      <p>Manga</p>
      <p>Premium</p>
      <p>Filter</p>
      <input type="text" name="" id="" className='search_input' />
</div>
<div className="right">sign in/sign up</div>
  </div>
);

export default Header;