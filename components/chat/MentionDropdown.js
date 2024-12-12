const MentionDropdown = ({
  participants,
  activeIndex,
  onSelect,
  onMouseEnter,
}) => {
  return (
    <div className="mention-dropdown">
      {participants.map((user, index) => (
        <div
          key={user._id}
          className={`mention-item ${index === activeIndex ? "active" : ""}`}
          onClick={() => onSelect(user)}
          onMouseEnter={() => onMouseEnter(index)}
        >
          <div className="mention-name">
            {user.name}
            {user.isAI && <span className="ai-badge">AI</span>}
          </div>
          {user.email && <div className="mention-email">{user.email}</div>}
        </div>
      ))}
    </div>
  );
};
