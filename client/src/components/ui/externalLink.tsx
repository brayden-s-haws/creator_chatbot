
import { ExternalLink as LucideExternalLink } from "lucide-react";

type ExternalLinkProps = React.ComponentProps<typeof LucideExternalLink>;

const ExternalLink = (props: ExternalLinkProps) => {
  return <LucideExternalLink {...props} />;
};

export default ExternalLink;
export { ExternalLink };
