import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      offset={24}
      gap={12}
      duration={4000}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'nesto-toast',
          title: 'nesto-toast-title',
          description: 'nesto-toast-description',
          success: 'nesto-toast-success',
          error: 'nesto-toast-error',
          warning: 'nesto-toast-warning',
          info: 'nesto-toast-info',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
